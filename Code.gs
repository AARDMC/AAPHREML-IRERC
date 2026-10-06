// ============================================================================
// Code.gs — Main Entry Point & Web Application Dispatcher for AAPHREML-IRERC
// Addis Ababa City Administration Health Bureau Institutional Research Ethics Review Committee
// ============================================================================

/**
 * Serves the Web Application user interface.
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.appName = CFG.APP_NAME;
  template.orgName = CFG.ORG_NAME;
  template.committeeName = CFG.COMMITTEE_NAME;
  
  return template.evaluate()
    .setTitle(CFG.APP_NAME)
    .setFaviconUrl('https://img.icons8.com/color/48/caduceus.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Template include helper to modularize CSS and HTML client scripts.
 * Example in Index.html: <?!= include('styles/styles') ?>
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    Logger.log('Could not include file: ' + filename + ' (' + err.message + ')');
    return '<!-- Error including ' + filename + ' -->';
  }
}

// ============================================================================
// PUBLIC CLIENT-CALLABLE API (google.script.run)
// ============================================================================

// ---- 1. Authentication & Session ----
function apiGetSessionUser() {
  return getSessionUser();
}
function apiLoginUser(email, password) {
  return loginUser(email, password);
}
function apiLogoutUser() {
  return logoutUser();
}

// ---- 2. Protocols & Directories ----
function apiGetAllProtocols(filters) {
  return getAllProtocols(filters);
}
function apiGetProtocolDetails(protocolId) {
  return getProtocolDetails(protocolId);
}
function apiGetNextProtocolCode() {
  return apiSuccess({ code: getNextProtocolCode() });
}

// ---- 3. Submission & Validation ----
function apiSubmitNewProtocol(payload) {
  return submitNewProtocol(payload);
}

// ---- 4. Administrative Screening ----
function apiMarkProtocolReceived(protocolId) {
  return markProtocolReceived(protocolId);
}
function apiPerformAdministrativeCheck(protocolId, checkResults, generalNotes) {
  return performAdministrativeCheck(protocolId, checkResults, generalNotes);
}
function apiClassifyReviewType(protocolId, reviewType, justification) {
  return classifyReviewType(protocolId, reviewType, justification);
}

// ---- 5. Reviewer Assignment & COI ----
function apiGetAvailableReviewers(studyCategory) {
  return getAvailableReviewers(studyCategory);
}
function apiGetReviewerWorkload() {
  return getReviewerWorkload();
}
function apiAssignReviewers(protocolId, reviewerList, deadlineDays, notes) {
  return assignReviewersToProtocol(protocolId, reviewerList, deadlineDays, notes);
}
function apiReassignReviewer(assignmentId, newReviewer, reason) {
  return reassignReviewer(assignmentId, newReviewer, reason);
}
function apiDeclareReviewerCoi(assignmentId, hasConflict, details) {
  return declareReviewerCoi(assignmentId, hasConflict, details);
}

// ---- 6. Study Assessments ----
function apiPrepareAssessmentForm(protocolId, reviewerId) {
  return prepareAssessmentForm(protocolId, reviewerId);
}
function apiSubmitCompletedAssessment(payload) {
  return submitCompletedAssessment(payload);
}
function apiGetGatheredAssessmentReports(protocolId) {
  return getGatheredAssessmentReports(protocolId);
}

// ---- 7. Expedited Review ----
function apiRecordExpeditedClassification(protocolId, payload) {
  return recordExpeditedClassification(protocolId, payload);
}
function apiSubmitExpeditedDecision(protocolId, payload) {
  return submitExpeditedReviewDecision(protocolId, payload);
}

// ---- 8. IRERC Decisions & Communications ----
function apiRecordFormalDecision(payload) {
  return recordFormalDecision(payload);
}
function apiVerifyConditionCompliance(conditionId, notes) {
  return verifyConditionCompliance(conditionId, notes);
}
function apiSendDecisionCommunication(payload) {
  return sendDecisionCommunication(payload);
}
function apiGetMyNotifications() {
  return getMyNotifications();
}
function apiMarkNotificationRead(notifId) {
  return markNotificationRead(notifId);
}

// ---- 9. Amendments, Continuing Review & Termination ----
function apiSubmitProtocolAmendment(payload) {
  return submitProtocolAmendment(payload);
}
function apiClassifyAmendment(amendmentId, reviewPath, justification) {
  return classifyAmendmentReviewPath(amendmentId, reviewPath, justification);
}
function apiSubmitContinuingReview(payload) {
  return submitContinuingReview(payload);
}
function apiSubmitProtocolTermination(payload) {
  return submitProtocolTermination(payload);
}

// ---- 10. Post-Clearance Data Collection Monitoring ----
function apiStartDataCollection(protocolId, actualStartDate, confirmationStatement) {
  return startDataCollection(protocolId, actualStartDate, confirmationStatement);
}
function apiSubmitProgressReport(payload) {
  return submitProgressReport(payload);
}
function apiReviewProgressReport(reportId, reviewStatus, comments, suspendProtocol) {
  return reviewProgressReport(reportId, reviewStatus, comments, suspendProtocol);
}
function apiDeclareDataCollectionComplete(protocolId, completionDate, completionNotes) {
  return declareDataCollectionComplete(protocolId, completionDate, completionNotes);
}
function apiSubmitStudyCloseout(payload) {
  return submitStudyCloseout(payload);
}
function apiAcceptStudyCloseout(closeoutId, acceptanceNotes, returnForRevision) {
  return acceptStudyCloseout(closeoutId, acceptanceNotes, returnForRevision);
}
function apiResumeDataCollection(protocolId, resumeNotes) {
  return resumeDataCollection(protocolId, resumeNotes);
}
function apiGetProtocolProgressReports(protocolId) {
  return getProtocolProgressReports(protocolId);
}
function apiGetMonitoringDashboard() {
  return getMonitoringDashboard();
}
function apiCheckOverdueProgressReports() {
  return checkOverdueProgressReports();
}
function apiCheckExpiredClearances() {
  return checkExpiredClearances();
}

// ---- 11. Documents & Vault ----
function apiUploadProtocolDocument(payload) {
  return uploadProtocolDocument(payload);
}
function apiGetProtocolDocuments(protocolId) {
  return getProtocolDocumentsWithHistory(protocolId);
}
function apiVerifyDocument(docId, newStatus, notes) {
  return verifyDocument(docId, newStatus, notes);
}

// ---- 12. Meetings ----
function apiGetAllMeetings() {
  return getAllMeetings();
}
function apiScheduleMeeting(payload) {
  return scheduleMeeting(payload);
}
function apiGetMeetingDetails(meetingId) {
  return getMeetingDetails(meetingId);
}
function apiConcludeMeeting(payload) {
  return concludeMeetingWithDecisions(payload);
}

// ---- 13. Committee & Users ----
function apiGetCommitteeMembers() {
  return getCommitteeMembers();
}
function apiGetInvestigators() {
  return getInvestigators();
}
function apiSaveCommitteeMember(memberData) {
  return saveCommitteeMember(memberData);
}
function apiRegisterInvestigator(invData) {
  return registerInvestigator(invData);
}

// ---- 14. Reports, Dashboard & Audit ----
function apiGetDashboardMetrics(filters) {
  return getDashboardMetrics(filters);
}
function apiGenerateReport(reportType, filters) {
  return generateInstitutionalReport(reportType, filters);
}
function apiGetProtocolAuditTrail(protocolId) {
  return getProtocolAuditTrail(protocolId);
}
function apiGetSystemAuditLogs(filters) {
  return getSystemAuditLogs(filters);
}

// ---- 15. System Initialization & Demo Data ----
function apiInitDatabase() {
  return initDatabase();
}
function apiSeedDemoData() {
  return seedDemoData();
}

// ---- 16. AAPHREML-IRERC Portal Functions & Proposal Scanner ----
function apiProcessUploadedFile(fileName, fileData) {
  return processUploadedFile(fileName, fileData);
}
function apiDeleteFileFromDrive(storedName) {
  return deleteFileFromDrive(storedName);
}
function apiGenerateNextProtocolCode() {
  return generateNextProtocolCode();
}
function apiIsSubmissionEditable(code, piEmail) {
  return isSubmissionEditable(code, piEmail);
}
function apiLoadForEdit(code, email) {
  return loadForEdit(code, email);
}
function apiProcessFormSubmission(req) {
  return processFormSubmission(req);
}

function getCurrentUser() {
  var email = '';
  try { email = Session.getActiveUser().getEmail(); } catch (e) {}
  try {
    var ssId = (CFG && CFG.SPREADSHEET_ID) ? CFG.SPREADSHEET_ID : '14vqOZKSZZ6LXYco8NOsiK7-1PCUbUPfYzrVr-7OOAEE';
    var data = SpreadsheetApp.openById(ssId).getSheetByName('Users').getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][2] && String(data[i][2]).toLowerCase() === email.toLowerCase()) {
        return { email: email, name: data[i][1], role: data[i][3], status: data[i][6] };
      }
    }
  } catch (e) {}
  try {
    var sessUser = getSessionUser();
    if (sessUser) return { email: sessUser.email, name: sessUser.full_name, role: sessUser.role, status: 'Active' };
  } catch (e) {}
  return { email: email || 'pi.dereje@aau.edu.et', name: 'Dr. Dereje Haile', role: 'Investigator', status: 'Active' };
}

function getDashboardData(view) {
  var u = getCurrentUser(), me = (u.email || '').toLowerCase();
  var v = pSheet_().getDataRange().getValues(), out = [];
  var quorum = (CFG && CFG.ETHICS_QUORUM) ? CFG.ETHICS_QUORUM : 2;
  for (var i = 1; i < v.length; i++) {
    var r = v[i]; if (!r[0]) continue;
    var archived = r[13] === 'Yes', status = r[9];
    var ok = view === 'Researcher' ? String(r[3]).toLowerCase() === me
      : view === 'Secretariat' ? !archived
      : view === 'Reviewer' ? String(r[7]).toLowerCase() === me
      : view === 'Ethics' ? status === 'S6 - Reviewed'
      : view === 'Chair' ? status === 'S7 - Ethics Approved'
      : view === 'Archive' ? archived : false;
    if (!ok) continue;
    var ap = String(r[12] || '').split(',').filter(Boolean);
    out.push({
      id: str_(r[0]), title: str_(r[1]), piName: str_(r[2]), status: str_(status),
      deadline: str_(r[8]), review: str_(r[11]), approvals: ap.length, quorum: quorum,
      done: ap.map(function(a) { return a.toLowerCase(); }).indexOf(me) !== -1,
      letter: str_(r[14])
    });
  }
  return out;
}

function assignReviewer(protocolId, reviewerEmail) {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reviewerEmail)) throw new Error('Invalid reviewer email.');
  return withTransactionLock(function() {
    var s = pSheet_(), p = findProtocol_(s, protocolId);
    var deadline = calculateDeadline(new Date(), 7);
    s.getRange(p.row, 8, 1, 2).setValues([[reviewerEmail, deadline]]);
    setStatus_(s, p, 'S5 - Assigned', getCurrentUser().email, 'Reviewer: ' + reviewerEmail);
    try { MailApp.sendEmail(reviewerEmail, 'Protocol assigned: ' + protocolId, 'You have been assigned ' + protocolId + '. Deadline: ' + str_(deadline)); } catch (e) {}
    return 'Reviewer assigned. Deadline: ' + str_(deadline);
  });
}

function calculateDeadline(startDate, daysToAdd) {
  var holidays = [];
  try {
    var ssId = (CFG && CFG.SPREADSHEET_ID) ? CFG.SPREADSHEET_ID : '14vqOZKSZZ6LXYco8NOsiK7-1PCUbUPfYzrVr-7OOAEE';
    var hs = SpreadsheetApp.openById(ssId).getSheetByName('Holidays');
    if (hs && hs.getLastRow() > 1) {
      holidays = hs.getRange('A2:A' + hs.getLastRow()).getValues().map(function(r) { return r[0] instanceof Date ? str_(r[0]) : null; }).filter(Boolean);
    }
  } catch (e) {}
  var d = new Date(startDate);
  var added = 0;
  while (added < daysToAdd) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6 && holidays.indexOf(str_(d)) === -1) added++;
  }
  return d;
}

function submitReview(id, decision, comments) {
  var u = getCurrentUser();
  if (['Recommend', 'Return'].indexOf(decision) === -1) throw new Error('Invalid decision.');
  return withTransactionLock(function() {
    var s = pSheet_(), p = findProtocol_(s, id);
    s.getRange(p.row, 12).setValue((decision === 'Recommend' ? 'Recommended: ' : 'Returned: ') + String(comments || '').slice(0, 2000));
    setStatus_(s, p, decision === 'Recommend' ? 'S6 - Reviewed' : 'S9 - Returned', u.email, 'Review submitted');
    return 'Review submitted.';
  });
}

function ethicsApprove(id) {
  var u = getCurrentUser();
  var quorum = (CFG && CFG.ETHICS_QUORUM) ? CFG.ETHICS_QUORUM : 2;
  return withTransactionLock(function() {
    var s = pSheet_(), p = findProtocol_(s, id);
    var list = String(p.vals[12] || '').split(',').filter(Boolean);
    if (list.map(function(a) { return a.toLowerCase(); }).indexOf(u.email.toLowerCase()) !== -1) {
      throw new Error('You already approved this protocol.');
    }
    list.push(u.email);
    s.getRange(p.row, 13).setValue(list.join(','));
    logStatus(id, 'Ethics approval ' + list.length + '/' + quorum, u.email);
    if (list.length >= quorum) {
      setStatus_(s, p, 'S7 - Ethics Approved', u.email, 'Quorum reached');
    }
    return 'Approval recorded (' + list.length + '/' + quorum + ').';
  });
}

function chairDecide(id, decision, remarks) {
  var u = getCurrentUser();
  return withTransactionLock(function() {
    var s = pSheet_(), p = findProtocol_(s, id);
    if (decision === 'Return') {
      s.getRange(p.row, 12).setValue('Chair returned: ' + String(remarks || '').slice(0, 2000));
      setStatus_(s, p, 'S9 - Returned', u.email, 'Returned by Chair');
      return 'Protocol returned.';
    }
    var folderId = (CFG && CFG.FOLDER_ID) ? CFG.FOLDER_ID : '1k-1rf7Hu6rzuxYy7PEnRO3XNPN4f8O-5';
    var doc = DocumentApp.create('Clearance Letter - ' + id);
    var b = doc.getBody();
    b.appendParagraph('AAPHREML-IRERC ETHICAL CLEARANCE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    b.appendParagraph('Protocol: ' + id + '\nTitle: ' + p.vals[1] + '\nPrincipal Investigator: ' + p.vals[2] + '\nDate: ' + str_(new Date()));
    b.appendParagraph('The committee has reviewed and approved this protocol for implementation.');
    if (remarks) b.appendParagraph('Remarks: ' + remarks);
    b.appendParagraph('\nSigned digitally: ' + u.name + ', Chairperson (' + u.email + ') on ' + new Date().toISOString());
    doc.saveAndClose();
    var f = DriveApp.getFileById(doc.getId());
    try {
      f.moveTo(DriveApp.getFolderById(folderId));
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    s.getRange(p.row, 11).setValue('Approved');
    s.getRange(p.row, 14, 1, 2).setValues([['Yes', f.getUrl()]]);
    setStatus_(s, p, 'S8 - Approved', u.email, 'Clearance letter signed');
    try { MailApp.sendEmail(p.vals[3], 'Ethical clearance: ' + id, 'Your protocol was approved. Letter: ' + f.getUrl()); } catch (e) {}
    return 'Approved, letter signed and protocol archived.';
  });
}

function findProtocol_(sheet, id) {
  var v = sheet.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() === String(id).trim()) {
      return { row: i + 1, vals: v[i] };
    }
  }
  throw new Error('Protocol not found: ' + id);
}

function setStatus_(sheet, p, status, by, note) {
  sheet.getRange(p.row, 10).setValue(status);
  logStatus(p.vals[0], status, by, note);
}

function logStatus(protocolId, status, userEmail, note) {
  try {
    var ssId = (CFG && CFG.SPREADSHEET_ID) ? CFG.SPREADSHEET_ID : '14vqOZKSZZ6LXYco8NOsiK7-1PCUbUPfYzrVr-7OOAEE';
    SpreadsheetApp.openById(ssId).getSheetByName('StatusLog')
      .appendRow(['LOG-' + Date.now(), protocolId, status, new Date(), userEmail, note || 'System Update']);
  } catch (e) {}
}
