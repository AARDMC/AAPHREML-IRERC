// ============================================================================
// Auth.gs — Authentication, Session Tokens & RBAC Security Layer
// ============================================================================

var SESSION_PROPERTY_PREFIX_ = 'IRERC_SESSION_';
var SESSION_DURATION_MS_ = 8 * 60 * 60 * 1000;

function _hashSessionToken_(token) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
}

function _issueSessionToken_(userId) {
  var properties = PropertiesService.getScriptProperties();
  var now = Date.now();
  var existing = properties.getProperties();

  Object.keys(existing).forEach(function(key) {
    if (key.indexOf(SESSION_PROPERTY_PREFIX_) !== 0) return;
    try {
      var session = JSON.parse(existing[key]);
      if (!session.expires_at || session.expires_at <= now) {
        properties.deleteProperty(key);
      }
    } catch (e) {
      properties.deleteProperty(key);
    }
  });

  var token = Utilities.getUuid() + Utilities.getUuid();
  properties.setProperty(
    SESSION_PROPERTY_PREFIX_ + _hashSessionToken_(token),
    JSON.stringify({ user_id: userId, expires_at: now + SESSION_DURATION_MS_ })
  );
  return token;
}

function _resolveSessionToken_(token) {
  if (!token || typeof token !== 'string') return null;

  var properties = PropertiesService.getScriptProperties();
  var key = SESSION_PROPERTY_PREFIX_ + _hashSessionToken_(token);
  var value = properties.getProperty(key);
  if (!value) return null;

  var session;
  try {
    session = JSON.parse(value);
  } catch (e) {
    properties.deleteProperty(key);
    return null;
  }

  if (!session.user_id || !session.expires_at || session.expires_at <= Date.now()) {
    properties.deleteProperty(key);
    return null;
  }

  var user = dbFindById_(TABLES.USERS, session.user_id);
  if (!user || !user.is_active) {
    properties.deleteProperty(key);
    return null;
  }
  return sanitizeUserForClient_(user);
}

function _revokeSessionToken_(token) {
  if (!token) return;
  PropertiesService.getScriptProperties().deleteProperty(
    SESSION_PROPERTY_PREFIX_ + _hashSessionToken_(token)
  );
}

function getSessionUser_() {
  return _API_SESSION_USER_;
}

/**
 * Authenticates user credentials (email & password)
 */
function loginUser_(email, plainPassword) {
  if (!email || !isValidEmail_(email)) {
    return apiError_('Please provide a valid email address.');
  }
  if (!plainPassword) {
    return apiError_('Password is required.');
  }

  var users = dbFind_(TABLES.USERS, function(u) {
    return String(u.email).toLowerCase() === String(email).trim().toLowerCase();
  });

  if (users.length === 0) {
    return apiError_('Invalid email or password.');
  }

  var user = users[0];
  if (!user.is_active) {
    return apiError_('This account has been deactivated. Please contact the Secretariat.');
  }

  if (!verifyPassword_(plainPassword, user.password_hash)) {
    return apiError_('Invalid email or password.');
  }

  var passwordHash = user.password_hash;
  if (String(passwordHash).indexOf('v2$') !== 0) {
    passwordHash = hashPassword_(plainPassword);
  }

  // Update last login timestamp and upgrade legacy password hashes on successful login.
  dbUpdate_(TABLES.USERS, user.user_id, {
    last_login: new Date().toISOString(),
    password_hash: passwordHash
  });

  var sessionToken = _issueSessionToken_(user.user_id);

  // Log audit
  logAuditEvent_(null, user.user_id, user.full_name, user.role, 'USER_LOGIN', '', '', 'User authenticated successfully.');

  return apiSuccess_({
    user: sanitizeUserForClient_(user),
    session_token: sessionToken
  }, 'Login successful.');
}

/**
 * Terminates user session
 */
function logoutUser_() {
  _revokeSessionToken_(_API_SESSION_TOKEN_);
  return apiSuccess_(null, 'Logged out successfully.');
}

/**
 * Google sign-in is disabled until a verifiable OAuth token flow is configured.
 */
function googleAuth_(payload) {
  return apiError_('Google sign-in is not configured. Please sign in with your registered email and password.');
}


/**
 * Role-Based Access Control Gatekeeper
 * Throws an exception if current session user does not hold an authorized role.
 */
function requireAuthorizedRole_(allowedRoles) {
  var user = getSessionUser_();
  if (!user) {
    throw new Error('Authentication required. Please log in.');
  }

  if (!Array.isArray(allowedRoles)) {
    allowedRoles = [allowedRoles];
  }

  if (allowedRoles.indexOf(user.role) === -1 && user.role !== ROLES.ADMIN) {
    throw new Error('Access denied: Action requires ' + allowedRoles.join(' or ') + ' privilege.');
  }

  return user;
}

function bootstrapAdministrator_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var properties = PropertiesService.getScriptProperties();
    var email = String(properties.getProperty('INITIAL_ADMIN_EMAIL') || '').trim().toLowerCase();
    var password = properties.getProperty('INITIAL_ADMIN_PASSWORD') || '';

    if (!isValidEmail_(email) || password.length < 12) {
      throw new Error('Set INITIAL_ADMIN_EMAIL and an INITIAL_ADMIN_PASSWORD of at least 12 characters in Script Properties first.');
    }

    var admins = dbFind_(TABLES.USERS, function(user) {
      return user.role === ROLES.ADMIN && user.is_active;
    });
    if (admins.length) {
      throw new Error('An active administrator already exists. Use the account recovery process instead.');
    }
    if (!isPasswordUnique_(password)) {
      throw new Error('The initial administrator password must not be used by another account.');
    }

    var user = {
      user_id: 'USR-ADMIN-' + generateUuid_().substring(0, 8).toUpperCase(),
      email: email,
      password_hash: hashPassword_(password),
      full_name: 'System Administrator',
      role: ROLES.ADMIN,
      telephone: '',
      is_active: true
    };
    dbInsert_(TABLES.USERS, user);
    properties.deleteProperty('INITIAL_ADMIN_PASSWORD');
    properties.deleteProperty('INITIAL_ADMIN_EMAIL');
    return { success: true, email: email };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Owner-run one-time entry point for creating the first administrator.
 */
function bootstrapInitialAdministrator() {
  return bootstrapAdministrator_();
}

/**
 * Strips sensitive password hash before returning user object to client
 */
function sanitizeUserForClient_(user) {
  if (!user) return null;
  var safe = Object.assign({}, user);
  delete safe.password_hash;

  // If committee member, augment with committee profile
  if (user.role === ROLES.REVIEWER || user.role === ROLES.CHAIR || user.role === ROLES.VICE_CHAIR) {
    var members = dbFind_(TABLES.COMMITTEE_MEMBERS, function(m) {
      return m.user_id === user.user_id || m.email === user.email;
    });
    if (members.length > 0) {
      safe.committee_profile = members[0];
    }
  }

  // If investigator, augment with investigator profile
  if (user.role === ROLES.INVESTIGATOR) {
    var investigators = dbFind_(TABLES.INVESTIGATORS, function(inv) {
      return inv.user_id === user.user_id || inv.email === user.email;
    });
    if (investigators.length > 0) {
      safe.investigator_profile = investigators[0];
    }
  }

  return safe;
}
