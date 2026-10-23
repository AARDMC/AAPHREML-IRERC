// ============================================================================
// SeedData.gs — Comprehensive Realistic Demo Data Seeder
// Seeds 10 Investigators, 10 Committee Members, and 20 Realistic Protocols
// All demo data is strictly labeled "[DEMO DATA]"
// ============================================================================

/**
 * Seeds complete demo database.
 */
function seedDemoData_() {
  if (PropertiesService.getScriptProperties().getProperty('ALLOW_DEMO_DATA_SEEDING') !== 'true') {
    throw new Error('Demo seeding is disabled. Enable ALLOW_DEMO_DATA_SEEDING only in a disposable test project.');
  }
  initDatabase_();

  return withTransactionLock_(function() {
    var nowIso = new Date().toISOString();
    // 1. Seed Institutions (Addis Ababa Facilities)
    var institutions = [
      { id: 'INST-01', name: 'Tikur Anbessa Specialized Hospital', type: 'Specialized Hospital', sc: 'Lideta' },
      { id: 'INST-02', name: 'St. Paul Hospital Millennium Medical College', type: 'Specialized Hospital', sc: 'Gulele' },
      { id: 'INST-03', name: 'Zewditu Memorial Hospital', type: 'General Hospital', sc: 'Kirkos' },
      { id: 'INST-04', name: 'Yekatit 12 Hospital Medical College', type: 'Specialized Hospital', sc: 'Arada' },
      { id: 'INST-05', name: 'ALERT Comprehensive Specialized Hospital', type: 'Specialized Hospital', sc: 'Kolfe Keranyo' },
      { id: 'INST-06', name: 'Eka Kotebe General Hospital', type: 'General Hospital', sc: 'Yeka' },
      { id: 'INST-07', name: 'Addis Ababa University - School of Public Health', type: 'Academic Institution', sc: 'Lideta' },
      { id: 'INST-08', name: 'Ethiopian Public Health Institute (EPHI)', type: 'National Research Institute', sc: 'Gulele' },
      { id: 'INST-09', name: 'Armauer Hansen Research Institute (AHRI)', type: 'Biomedical Research Institute', sc: 'Kolfe Keranyo' },
      { id: 'INST-10', name: 'Addis Ababa Public Health Research & Emergency Management (AAPHREM)', type: 'Regional Health Authority', sc: 'Kirkos' }
    ];

    institutions.forEach(function(inst) {
      if (!dbFindById_(TABLES.INSTITUTIONS, inst.id)) {
        dbInsert_(TABLES.INSTITUTIONS, {
          institution_id: inst.id,
          institution_name: '[DEMO DATA] ' + inst.name,
          code: inst.id,
          institution_type: inst.type,
          sub_city: inst.sc,
          woreda: '01',
          contact_person: 'Research Coordinator',
          contact_email: 'research@' + inst.id.toLowerCase() + '.gov.et',
          telephone: '+251 11 551 0000',
          is_active: true
        });
      }
    });

    // 2. Seed 10 Multidisciplinary Committee Members
    var membersData = [
      { name: 'Dr. Daniel Worku', email: 'chair.daniel@aahb.gov.et', cat: 'Clinical Expert', role: ROLES.CHAIR, pos: 'Associate Professor of Internal Medicine', inst: 'Tikur Anbessa Hospital' },
      { name: 'Dr. Selamawit Bekele', email: 'vchair.selamawit@aahb.gov.et', cat: 'Public Health Expert', role: ROLES.VICE_CHAIR, pos: 'Senior Epidemiologist', inst: 'AAU School of Public Health' },
      { name: 'Ato Solomon Gizaw', email: 'sec.solomon@aahb.gov.et', cat: 'Ethics/Legal Expert', role: ROLES.SECRETARIAT, pos: 'IRERC Secretary & Bioethicist', inst: 'Addis Ababa Health Bureau' },
      { name: 'Dr. Hanna Tadesse', email: 'rev.hanna@aahb.gov.et', cat: 'Clinical Expert', role: ROLES.REVIEWER, pos: 'Consultant Pediatrician', inst: 'Yekatit 12 Hospital' },
      { name: 'W/ro Bethlehem Alemayehu', email: 'rev.bethlehem@aahb.gov.et', cat: 'Environmental Health Professional', role: ROLES.REVIEWER, pos: 'Lead Environmental Health Officer', inst: 'AAPHREM' },
      { name: 'Ato Yonas Fikre', email: 'rev.yonas@aahb.gov.et', cat: 'Laboratory Scientist', role: ROLES.REVIEWER, pos: 'Principal Molecular Microbiologist', inst: 'EPHI' },
      { name: 'W/ro Rahel Negash', email: 'rev.rahel@aahb.gov.et', cat: 'Ethics/Legal Expert', role: ROLES.REVIEWER, pos: 'Senior Legal & Regulatory Counsel', inst: 'Addis Ababa Health Bureau' },
      { name: 'Ato Abinet Kebede', email: 'rev.abinet@aahb.gov.et', cat: 'Public Health Expert', role: ROLES.REVIEWER, pos: 'Health Systems Specialist', inst: 'St. Paul Hospital' },
      { name: 'W/ro Aster Hailu', email: 'rev.aster@aahb.gov.et', cat: 'Community Representative', role: ROLES.REVIEWER, pos: 'Community Health Liaison & Advocate', inst: 'Addis Ababa Women Association' },
      { name: 'Dr. Mulatu Tesfaye', email: 'rev.mulatu@aahb.gov.et', cat: 'Clinical Expert', role: ROLES.REVIEWER, pos: 'Consultant Infectious Disease Specialist', inst: 'ALERT Hospital' }
    ];

    var seededMemberRecords = [];
    membersData.forEach(function(m, idx) {
      var email = m.email.toLowerCase();
      var user = dbFind_(TABLES.USERS, function(u) { return u.email === email; })[0];
      var userId;
      if (!user) {
        var demoPassword = generateUuid_() + generateUuid_();
        while (!isPasswordUnique_(demoPassword)) {
          demoPassword = generateUuid_() + generateUuid_();
        }
        userId = 'USR-MBR-' + (idx + 1);
        dbInsert_(TABLES.USERS, {
          user_id: userId,
          email: email,
          password_hash: hashPassword_(demoPassword),
          full_name: '[DEMO DATA] ' + m.name,
          role: m.role,
          telephone: '+251 91 100 00' + ('0' + idx).slice(-2),
          is_active: true
        });
      } else {
        userId = user.user_id;
      }

      var mbrId = 'MBR-' + ('0' + (idx + 1)).slice(-2);
      var existingMbr = dbFindById_(TABLES.COMMITTEE_MEMBERS, mbrId);
      var mbrRecord;
      if (!existingMbr) {
        mbrRecord = dbInsert_(TABLES.COMMITTEE_MEMBERS, {
          member_id: mbrId,
          user_id: userId,
          full_name: '[DEMO DATA] ' + m.name,
          professional_category: m.cat,
          institution: m.inst,
          position: m.pos,
          email: email,
          telephone: '+251 91 100 00' + ('0' + idx).slice(-2),
          committee_role: m.role,
          date_assigned: '2025-01-15',
          coi_status: 'Cleared',
          is_active: true
        });
      } else {
        mbrRecord = existingMbr;
      }
      seededMemberRecords.push(mbrRecord);
    });

    // 3. Seed 10 Principal Investigators
    var investigatorsData = [
      { name: 'Dr. Dereje Haile', email: 'pi.dereje@aau.edu.et', inst: 'Addis Ababa University', dept: 'Epidemiology' },
      { name: 'Dr. Tigist Mengistu', email: 'pi.tigist@ahri.gov.et', inst: 'Armauer Hansen Research Institute', dept: 'Immunology' },
      { name: 'Dr. Berhanu Assefa', email: 'pi.berhanu@ephi.gov.et', inst: 'Ethiopian Public Health Institute', dept: 'Bacteriology' },
      { name: 'Dr. Almaz Tefera', email: 'pi.almaz@sphmmc.edu.et', inst: 'St. Paul Hospital MMC', dept: 'Obstetrics & Gynecology' },
      { name: 'Dr. Getachew Kassa', email: 'pi.getachew@tash.edu.et', inst: 'Tikur Anbessa Hospital', dept: 'Oncology' },
      { name: 'Dr. Hiwot Girma', email: 'pi.hiwot@aaphrem.gov.et', inst: 'AAPHREM', dept: 'Surveillance & Disease Control' },
      { name: 'Dr. Ermias Desta', email: 'pi.ermias@alert.gov.et', inst: 'ALERT Hospital', dept: 'Dermatology & Leprosy' },
      { name: 'Dr. Meron Abebe', email: 'pi.meron@yekatit12.edu.et', inst: 'Yekatit 12 Hospital', dept: 'Pediatrics' },
      { name: 'Dr. Tewodros Kassahun', email: 'pi.tewodros@zewditu.gov.et', inst: 'Zewditu Memorial Hospital', dept: 'Infectious Diseases' },
      { name: 'Dr. Senait Wolde', email: 'pi.senait@ekakotebe.gov.et', inst: 'Eka Kotebe Hospital', dept: 'Pulmonology' }
    ];

    var seededPiRecords = [];
    investigatorsData.forEach(function(inv, idx) {
      var email = inv.email.toLowerCase();
      var user = dbFind_(TABLES.USERS, function(u) { return u.email === email; })[0];
      var userId;
      if (!user) {
        var demoPassword = generateUuid_() + generateUuid_();
        while (!isPasswordUnique_(demoPassword)) {
          demoPassword = generateUuid_() + generateUuid_();
        }
        userId = 'USR-PI-' + (idx + 1);
        dbInsert_(TABLES.USERS, {
          user_id: userId,
          email: email,
          password_hash: hashPassword_(demoPassword),
          full_name: '[DEMO DATA] ' + inv.name,
          role: ROLES.INVESTIGATOR,
          telephone: '+251 92 200 00' + ('0' + idx).slice(-2),
          is_active: true
        });
      } else {
        userId = user.user_id;
      }

      var invId = 'INV-' + ('0' + (idx + 1)).slice(-2);
      var existingInv = dbFindById_(TABLES.INVESTIGATORS, invId);
      var invRecord;
      if (!existingInv) {
        invRecord = dbInsert_(TABLES.INVESTIGATORS, {
          investigator_id: invId,
          user_id: userId,
          full_name: '[DEMO DATA] ' + inv.name,
          institution_id: 'INST-01',
          institution_name: inv.inst,
          department: inv.dept,
          email: email,
          telephone: '+251 92 200 00' + ('0' + idx).slice(-2),
          qualification: 'MD, PhD, Associate Professor',
          cv_drive_id: ''
        });
      } else {
        invRecord = existingInv;
      }
      seededPiRecords.push(invRecord);
    });

    // 4. Seed 20 Realistic Research Protocols Spanning All Lifecycle Statuses
    var sampleProtocols = [
      {
        id: 'IRERC-2026-0001',
        title: 'Evaluation of Real-Time PCR vs Rapid Diagnostic Tests for Cholera Outbreak Surveillance in Addis Ketema Sub-City',
        piIdx: 5, category: 'Biomedical & Laboratory', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.SUBMITTED, stage: 'Administrative Screening Pending', date: '2026-09-01'
      },
      {
        id: 'IRERC-2026-0002',
        title: 'Efficacy of Community-Led WASH Interventions on Childhood Diarrheal Incidence in Informal Settlements of Kolfe Keranyo',
        piIdx: 0, category: 'Public Health & Health Systems', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.ADMINISTRATIVE_CHECK, stage: 'Administrative Completeness Verification', date: '2026-09-03'
      },
      {
        id: 'IRERC-2026-0003',
        title: 'Molecular Characterization of Multidrug-Resistant Mycobacterium tuberculosis Isolates in Referral Hospitals of Addis Ababa',
        piIdx: 2, category: 'Biomedical & Laboratory', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.APPROVED, stage: 'Ethical Approval Active', date: '2026-07-10', approvalDate: '2026-08-01', expiryDate: '2027-08-01'
      },
      {
        id: 'IRERC-2026-0004',
        title: 'Retrospective Clinical Audit of Perinatal Mortality Audit Records Across 10 Public Hospitals (2023-2025)',
        piIdx: 7, category: 'Observational / Epidemiological', reviewType: REVIEW_TYPES.EXPEDITED,
        status: STATUS.APPROVED, stage: 'Approved via Expedited Review', date: '2026-08-15', approvalDate: '2026-08-22', expiryDate: '2027-08-22'
      },
      {
        id: 'IRERC-2026-0005',
        title: 'Cross-Sectional Survey of Antimicrobial Stewardship Practices Among Healthcare Providers in Addis Ababa Private Health Facilities',
        piIdx: 1, category: 'Health Systems & Policy', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.REVIEWER_ASSIGNED, stage: 'Assigned to Lead Reviewer (Dr. Hanna Tadesse)', date: '2026-09-12'
      },
      {
        id: 'IRERC-2026-0006',
        title: 'Randomized Controlled Trial of Mobile Health (mHealth) SMS Reminders for Antenatal Care Adherence in Gulele Woredas',
        piIdx: 3, category: 'Clinical Trial / Interventional', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.UNDER_REVIEW, stage: 'Under Review by Ethics Committee Reviewers', date: '2026-09-08'
      },
      {
        id: 'IRERC-2026-0007',
        title: 'Assessment of Indoor Particulate Matter (PM2.5) Exposure and Respiratory Symptoms in Bakeries and Commercial Kitchens of Lideta',
        piIdx: 0, category: 'Environmental & Occupational Health', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.CORRECTION_REQUIRED, stage: 'Missing Participant Information Sheet in Amharic', date: '2026-09-15'
      },
      {
        id: 'IRERC-2026-0008',
        title: 'Prospective Cohort Study on Second-Line Antiretroviral Therapy Treatment Failure Biomarkers at Zewditu Memorial Hospital',
        piIdx: 8, category: 'Clinical Trial / Interventional', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.ASSESSMENT, stage: 'Assessment Form Completed - Awaiting Meeting Deliberation', date: '2026-08-20'
      },
      {
        id: 'IRERC-2026-0009',
        title: 'Prevalence of Occult Hepatitis B Infection Among Blood Donors at National Blood Bank Service',
        piIdx: 2, category: 'Biomedical & Laboratory', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.APPROVED_WITH_CONDITIONS, stage: 'Approved Pending Final Lab Standard Operating Procedures', date: '2026-08-05', approvalDate: '2026-08-25', expiryDate: '2027-08-25'
      },
      {
        id: 'IRERC-2026-0010',
        title: 'Investigating Cervical Cancer Screening Uptake Barriers Among Female Factory Workers in Bole Lemi Industrial Park',
        piIdx: 3, category: 'Socio-behavioral & Qualitative', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.MODIFICATIONS_REQUIRED, stage: 'Requires Revised Consent Procedure and Compensation Plan', date: '2026-08-18'
      },
      {
        id: 'IRERC-2026-0011',
        title: 'Genetic Diversity of Plasmodium vivax Isolates in Migrant Construction Workers in Akaki Kality',
        piIdx: 1, category: 'Biomedical & Laboratory', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.NOT_APPROVED, stage: 'Disapproved - Unjustified Invasiveness and Lack of Direct Benefit', date: '2026-07-22'
      },
      {
        id: 'IRERC-2026-0012',
        title: 'Feasibility of Point-of-Care Ultrasound for Emergency Triage in Low-Resource Health Centers of Nifas Silk Lafto',
        piIdx: 4, category: 'Health Systems & Policy', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.COMPLETE, stage: 'Screening Complete - Ready for Reviewer Assignment', date: '2026-09-20'
      },
      {
        id: 'IRERC-2026-0013',
        title: 'Occupational Biohazard Exposure and Post-Exposure Prophylaxis Adherence Among Emergency Medical Technicians in Addis Ababa',
        piIdx: 5, category: 'Environmental & Occupational Health', reviewType: REVIEW_TYPES.EXPEDITED,
        status: STATUS.UNDER_REVIEW, stage: 'Expedited Review Under Evaluation by Dr. Selamawit Bekele', date: '2026-09-18'
      },
      {
        id: 'IRERC-2026-0014',
        title: 'Nutritional Status and Neurocognitive Development Among Primary School Children Receiving School Feeding Programs in Arada',
        piIdx: 7, category: 'Observational / Epidemiological', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.COMMUNICATED, stage: 'Final Decision Communicated to PI', date: '2026-07-15', approvalDate: '2026-08-10', expiryDate: '2027-08-10'
      },
      {
        id: 'IRERC-2026-0015',
        title: 'Assessment of Mental Health Disorders and Burnout Syndrome Among Intensive Care Nurses During Epidemic Surges',
        piIdx: 9, category: 'Socio-behavioral & Qualitative', reviewType: REVIEW_TYPES.EXPEDITED,
        status: STATUS.APPROVED, stage: 'Approved via Expedited Review', date: '2026-06-10', approvalDate: '2026-06-25', expiryDate: '2027-06-25'
      },
      {
        id: 'IRERC-2026-0016',
        title: 'Phase II Open-Label Trial of Adjunctive Inhaled Nitric Oxide for Severe Pneumonia in St. Paul Specialized Pediatric ICU',
        piIdx: 3, category: 'Clinical Trial / Interventional', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.AMENDMENT_PENDING, stage: 'Amendment AMD-01 (Dose Escalation) Submitted', date: '2025-11-12', approvalDate: '2025-12-05', expiryDate: '2026-12-05'
      },
      {
        id: 'IRERC-2026-0017',
        title: 'Longitudinal Surveillance of Hospital-Acquired Bloodstream Infections and Device-Associated Infection Rates in Yekatit 12 Burn Unit',
        piIdx: 7, category: 'Observational / Epidemiological', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.CONTINUING_REVIEW_DUE, stage: 'Annual Continuing Review Progress Report Due', date: '2025-10-01', approvalDate: '2025-10-25', expiryDate: '2026-10-25'
      },
      {
        id: 'IRERC-2026-0018',
        title: 'Community Seroprevalence of Dengue Virus and Chikungunya Antibodies Following Flood Incidents in Akaki River Catchments',
        piIdx: 2, category: 'Biomedical & Laboratory', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.CONTINUING_REVIEW_PENDING, stage: 'Continuing Review Progress Report Under Review', date: '2025-09-10', approvalDate: '2025-10-05', expiryDate: '2026-10-05'
      },
      {
        id: 'IRERC-2026-0019',
        title: 'Post-Marketing Surveillance of Generic Tenofovir/Lamivudine/Dolutegravir Bioequivalence Profiles Among Adult Cohorts',
        piIdx: 8, category: 'Clinical Trial / Interventional', reviewType: REVIEW_TYPES.FULL_BOARD,
        status: STATUS.TERMINATED, stage: 'Study Completed per Protocol - Archived', date: '2024-05-15', approvalDate: '2024-06-15', expiryDate: '2025-06-15'
      },
      {
        id: 'IRERC-2026-0020',
        title: 'Validation of Tele-Dermatology Triaging Algorithms for Skin Neglected Tropical Diseases in Peripheral Clinics of Addis Ababa',
        piIdx: 6, category: 'Health Systems & Policy', reviewType: REVIEW_TYPES.EXPEDITED,
        status: STATUS.APPROVED, stage: 'Approved via Expedited Review', date: '2026-05-20', approvalDate: '2026-06-01', expiryDate: '2027-06-01'
      }
    ];

    sampleProtocols.forEach(function(pData) {
      var pi = seededPiRecords[pData.piIdx];
      var nowIsoDate = new Date(pData.date).toISOString();

      if (!dbFindById_(TABLES.PROTOCOLS, pData.id)) {
        dbInsert_(TABLES.PROTOCOLS, {
          protocol_id: pData.id,
          study_title: '[DEMO DATA] ' + pData.title,
          study_acronym: 'DEMO-' + pData.id.slice(-4),
          pi_id: pi.user_id,
          pi_name: pi.full_name,
          pi_email: pi.email,
          institution_id: 'INST-01',
          institution_name: pi.institution_name,
          department: pi.department,
          application_type: SUBMISSION_TYPES.INITIAL,
          study_category: pData.category,
          review_type: pData.reviewType,
          current_status: pData.status,
          current_stage: pData.stage,
          submission_date: nowIsoDate,
          approval_date: pData.approvalDate ? new Date(pData.approvalDate).toISOString() : '',
          expiry_date: pData.expiryDate || '',
          current_version: '1.0',
          parent_protocol_id: '',
          is_archived: pData.status === STATUS.TERMINATED,
          lead_reviewer_id: 'MBR-04',
          lead_reviewer_name: '[DEMO DATA] Dr. Hanna Tadesse',
          administrative_officer: '[DEMO DATA] Ato Solomon Gizaw',
          created_at: nowIsoDate,
          updated_at: nowIsoDate
        });

        // Protocol Details
        dbInsert_(TABLES.PROTOCOL_DETAILS, {
          detail_id: 'DET-' + pData.id.slice(-4),
          protocol_id: pData.id,
          study_objectives: '[DEMO DATA] Primary objective is to rigorously evaluate clinical and public health outcomes per established epidemiological protocols.',
          background: '[DEMO DATA] In Ethiopia, surveillance and evidence-based decision-making are critical to public health resilience.',
          study_design: 'Prospective Multicenter Epidemiological Study',
          study_population: 'Target population residing within selected woredas of Addis Ababa',
          study_site: 'Public Health Centers and Hospitals across Addis Ababa',
          sample_size: '450 participants',
          recruitment_method: 'Consecutive sampling at health facilities with informed consent',
          data_collection_method: 'Standardized digital questionnaires and laboratory diagnostic tests',
          study_duration_months: '12 Months',
          start_date: '2026-10-01',
          end_date: '2027-09-30',
          created_at: nowIsoDate
        });

        // Protocol Ethics Info
        dbInsert_(TABLES.PROTOCOL_ETHICS, {
          ethics_id: 'ETH-' + pData.id.slice(-4),
          protocol_id: pData.id,
          informed_consent_process: '[DEMO DATA] Written informed consent in Amharic obtained prior to enrollment with full explanation of study objectives.',
          vulnerable_populations: 'Pregnant women and children (special pediatric assent procedures apply)',
          potential_risks: 'Minimal physical discomfort during diagnostic sampling; mitigated by trained phlebotomists.',
          expected_benefits: 'Direct clinical diagnosis benefit and improved regional health guidelines.',
          confidentiality_measures: 'All data de-identified with unique research codes; encrypted database storage.',
          data_protection: 'Restricted access limited to authorized study investigators.',
          participant_compensation: 'Transportation allowance of 200 ETB provided for facility visits.',
          community_involvement: 'Community advisory board meetings scheduled with woreda health committees.',
          created_at: nowIsoDate
        });

        // Investigator-Uploaded Documents (4 core files submitted by the PI)
        var investigatorUploads = [
          { code: 'DOC_PROTOCOL', name: 'Research Proposal Document', file: pData.id + '_Research_Proposal.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
          { code: 'DOC_INST_SUPPORT', name: 'Institutional Supporting Letter', file: pData.id + '_Supporting_Letter.pdf', mime: 'application/pdf' },
          { code: 'DOC_PI_ID', name: 'Principal Investigator (PI) Identification Card', file: pData.id + '_PI_ID.jpg', mime: 'image/jpeg' },
          { code: 'DOC_CV', name: 'Principal Investigator Curriculum Vitae (CV)', file: pData.id + '_CV.pdf', mime: 'application/pdf' }
        ];

        investigatorUploads.forEach(function(dt) {
          dbInsert_(TABLES.PROTOCOL_DOCUMENTS, {
            doc_id: 'DOC-' + pData.id.slice(-4) + '-' + dt.code,
            protocol_id: pData.id,
            doc_type: dt.code,
            document_title: dt.name,
            current_version: '1.0',
            drive_file_id: 'DEMO_DRIVE_ID_' + pData.id.slice(-4) + '_' + dt.code,
            drive_url: 'https://drive.google.com/open?id=demo_file_' + pData.id.slice(-4) + '_' + dt.code,
            file_name: dt.file,
            mime_type: dt.mime,
            file_size_bytes: 1048576,
            status: DOC_STATUS.VERIFIED,
            verification_notes: 'Document verified during administrative check',
            verified_by: '[DEMO DATA] Ato Solomon Gizaw',
            uploaded_by: 'Investigator (' + pi.full_name + ')',
            uploaded_at: nowIsoDate,
            updated_at: nowIsoDate
          });
        });

        // Assign Reviewers
        dbInsert_(TABLES.REVIEWER_ASSIGNMENTS, {
          assignment_id: 'ASGN-' + pData.id.slice(-4) + '-01',
          protocol_id: pData.id,
          reviewer_id: 'MBR-04',
          reviewer_name: '[DEMO DATA] Dr. Hanna Tadesse',
          reviewer_email: 'rev.hanna@aahb.gov.et',
          assigned_by: '[DEMO DATA] Ato Solomon Gizaw',
          assigned_date: nowIsoDate,
          deadline_date: calculateWorkingDaysDeadline_(new Date(pData.date), 7),
          coi_declared: 'None Declared (Cleared)',
          coi_declared_date: nowIsoDate,
          coi_notes: 'No conflict of interest declared',
          status: 'In Progress',
          completed_date: '',
          notes: 'Assigned as Clinical Lead Reviewer',
          created_at: nowIsoDate
        });

        // Initial Audit Log
        logAuditEvent_(
          pData.id,
          pi.user_id,
          pi.full_name,
          ROLES.INVESTIGATOR,
          'DEMO_DATA_SEEDED',
          '',
          pData.status,
          '[DEMO DATA] Protocol registered with status: ' + pData.status
        );
      }
    });

    // 5. Seed Several Amendments for IRERC-2026-0016
    dbInsert_(TABLES.AMENDMENTS, {
      amendment_id: 'AMDREC-0016-01',
      protocol_id: 'IRERC-2026-0016',
      amendment_number: 'AMD-01',
      submission_date: '2026-09-10',
      amendment_title: '[DEMO DATA] Addition of Secondary Pediatric Biomarker Assay',
      amendment_type: 'Minor Amendment',
      review_path: REVIEW_TYPES.EXPEDITED,
      rationale: '[DEMO DATA] Inclusion of cytokine profiling to better track inflammatory progression.',
      summary_of_changes: 'Updated protocol page 14 section 4.2; revised consent form version 1.1.',
      chair_notified_date: '2026-09-10',
      status: 'Under Expedited Review',
      decision_id: '',
      decision_date: '',
      submitted_by: 'pi.almaz@sphmmc.edu.et',
      created_at: nowIso
    });

    // 6. Seed Continuing Reviews for IRERC-2026-0017 and 0018
    dbInsert_(TABLES.CONTINUING_REVIEWS, {
      cont_review_id: 'CR-0017-01',
      protocol_id: 'IRERC-2026-0017',
      submission_date: '2026-09-14',
      current_study_status: 'Active - Enrolling',
      target_sample_size: '300',
      enrolled_participants: 215,
      progress_summary: '[DEMO DATA] Year 1 surveillance successfully completed with 215 cohorts enrolled.',
      adverse_events_count: 0,
      adverse_events_summary: 'No unexpected serious adverse events encountered.',
      protocol_deviations_summary: 'None',
      next_review_date: '2027-10-25',
      decision_id: '',
      status: 'Submitted for IRERC Review',
      submitted_by: 'pi.meron@yekatit12.edu.et',
      created_at: nowIso
    });

    // 7. Seed Decisions for Approved Protocols
    dbInsert_(TABLES.DECISIONS, {
      decision_id: 'DEC-0003-01',
      protocol_id: 'IRERC-2026-0003',
      meeting_id: 'MTG-2026-002',
      decision_type: DECISIONS.APPROVED,
      decision_date: '2026-08-01',
      chairperson_id: 'MBR-01',
      chairperson_name: '[DEMO DATA] Dr. Daniel Worku',
      quorum_members_count: 7,
      summary_comments: '[DEMO DATA] Full approval granted. Study complies with ethical guidelines.',
      conditions_summary: 'Quarterly safety monitoring updates required.',
      modifications_required: '',
      approval_letter_doc_id: 'DOC-0003-LETTER',
      valid_from_date: '2026-08-01',
      valid_until_date: '2027-08-01',
      communication_date: '2026-08-02',
      status: 'Official',
      created_at: nowIso
    });

    // 8. Seed Sample Meeting
    dbInsert_(TABLES.IRERC_MEETINGS, {
      meeting_id: 'MTG-2026-002',
      meeting_number: 'MTG-2026-002',
      meeting_date: '2026-08-01',
      meeting_time: '09:00 AM',
      venue: 'Addis Ababa Health Bureau Main Conference Hall',
      chairperson_id: 'MBR-01',
      chairperson_name: '[DEMO DATA] Dr. Daniel Worku',
      secretary_id: 'MBR-03',
      status: 'Concluded',
      agenda_summary: '[DEMO DATA] Deliberation on TB surveillance (0003) and perinatal mortality audit (0004).',
      minutes_text: '[DEMO DATA] The committee convened with 7 members present. Quorum satisfied. Protocols 0003 approved.',
      minutes_drive_id: '',
      created_at: nowIso
    });

    Logger.log('Demo data successfully seeded with 10 PIs, 10 Committee Members, and 20 Protocols.');
    return apiSuccess_({
      message: 'Demo data successfully seeded. All demo entries labeled [DEMO DATA].',
      investigators_count: 10,
      members_count: 10,
      protocols_count: 20
    });
  });
}
