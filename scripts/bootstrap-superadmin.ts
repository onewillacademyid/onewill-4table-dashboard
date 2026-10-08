/**
 * Onewill Academy | Super Admin One-Time Bootstrap CLI Script
 * 
 * SERVER-ONLY CLI SCRIPT. NEVER EXPOSE AS A PUBLIC WEB API ROUTE.
 * 
 * Usage:
 *   # Dry-Run Verification (Default, No Writes):
 *   bun run scripts/bootstrap-superadmin.ts --email owner@onewillacademy.id --project onewill-academy-weekly-report
 * 
 *   # Real Atomic Write (Requires explicit --execute flag):
 *   bun run scripts/bootstrap-superadmin.ts --email owner@onewillacademy.id --project onewill-academy-weekly-report --execute
 */

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreInvitationDocument } from '../src/types/firestore';

const EXPECTED_PROJECT_ID = 'onewill-academy-weekly-report';

// Parse CLI command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let email = '';
  let project = '';
  let execute = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && i + 1 < args.length) {
      email = args[++i];
    } else if (arg === '--project' && i + 1 < args.length) {
      project = args[++i];
    } else if (arg === '--execute') {
      execute = true;
    }
  }

  return { email, project, execute };
}

// Ensure server-only execution
if (typeof window !== 'undefined') {
  console.error('CRITICAL SECURITY ERROR: Bootstrap script executed in browser environment!');
  process.exit(1);
}

async function main() {
  const { email, project, execute } = parseArgs();
  const isDryRun = !execute;

  console.log('--------------------------------------------------');
  console.log('Onewill Academy — Super Admin Bootstrap Verification');
  console.log('--------------------------------------------------');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (NO WRITES)' : 'REAL WRITE (--execute ACTIVE)'}`);

  // 1. Parameter Validations
  if (!email) {
    console.error('❌ ERROR: Missing required parameter --email <email>.');
    console.error('   Usage: bun run scripts/bootstrap-superadmin.ts --email owner@onewillacademy.id --project onewill-academy-weekly-report');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    console.error(`❌ ERROR: Invalid email format "${email}".`);
    process.exit(1);
  }

  if (!project) {
    console.error('❌ ERROR: Missing required parameter --project <project_id>.');
    console.error(`   Must match exact approved project ID: "${EXPECTED_PROJECT_ID}".`);
    process.exit(1);
  }

  // 2. Strict Project ID Validation against CLI argument
  if (project !== EXPECTED_PROJECT_ID) {
    console.error(`❌ CRITICAL SECURITY ERROR: Target project ID "${project}" does not match approved project ID "${EXPECTED_PROJECT_ID}".`);
    console.error('   Bootstrap execution prohibited on unapproved Firebase projects.');
    process.exit(1);
  }

  console.log(`Target Email:   ${normalizedEmail}`);
  console.log(`Target Project: ${project}`);
  console.log('--------------------------------------------------');

  // 3. Initialize Firebase Admin SDK (Prefers ADC / Configured Env)
  let adminApp: App;
  if (getApps().length > 0) {
    adminApp = getApp();
  } else {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    const isPlaceholderKey = !privateKey || privateKey.includes('YOUR_PRIVATE_KEY_HERE');
    const isPlaceholderEmail = !clientEmail || clientEmail.includes('xxxxx');

    if (clientEmail && privateKey && !isPlaceholderKey && !isPlaceholderEmail) {
      adminApp = initializeApp({
        credential: cert({
          projectId: project,
          clientEmail,
          privateKey,
        }),
        projectId: project,
      });
    } else {
      adminApp = initializeApp({
        projectId: project,
      });
    }
  }

  // Double Check: Verify actual initialized Firebase App target project ID matches approved project ID
  const resolvedProjectId = adminApp.options.projectId || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (resolvedProjectId && resolvedProjectId !== EXPECTED_PROJECT_ID) {
    console.error(`❌ CRITICAL SECURITY ERROR: Initialized Firebase Admin project ID "${resolvedProjectId}" does not match approved project "${EXPECTED_PROJECT_ID}".`);
    console.error('   Script aborted to prevent connecting to an unauthorized project via ADC or environment overrides.');
    process.exit(1);
  }

  const db = getFirestore(adminApp);

  try {
    // 4. Atomic Transaction Check & Idempotency Safeguards
    await db.runTransaction(async (transaction) => {
      // Safeguard A: Check Atomic Sentinel Document (Prevents concurrent bootstrap runs)
      const sentinelRef = db.collection('system_config').doc('bootstrap_sentinel');
      const sentinelSnap = await transaction.get(sentinelRef);

      if (sentinelSnap.exists) {
        const sentinelData = sentinelSnap.data();
        throw new Error(`BOOTSTRAP REJECTED: System bootstrap sentinel already exists (Target: ${sentinelData?.targetEmail}, Date: ${sentinelData?.bootstrappedAt}). System bootstrap has already been performed.`);
      }

      // Safeguard B: Check if any Super Admin user already exists in `users` collection
      const existingSuperAdminSnap = await transaction.get(
        db.collection('users').where('role', '==', 'SUPER_ADMIN').limit(1)
      );

      if (!existingSuperAdminSnap.empty) {
        const existingAdmin = existingSuperAdminSnap.docs[0].data();
        throw new Error(`BOOTSTRAP REJECTED: Super Admin account already exists in database (UID: ${existingAdmin.uid}, Email: ${existingAdmin.email}).`);
      }

      // Safeguard C: Check if pending Super Admin invitation already exists for target email
      const existingInvitationSnap = await transaction.get(
        db.collection('invitations')
          .where('normalizedEmail', '==', normalizedEmail)
          .where('role', '==', 'SUPER_ADMIN')
          .where('status', '==', 'PENDING')
          .limit(1)
      );

      if (!existingInvitationSnap.empty) {
        const inv = existingInvitationSnap.docs[0].data();
        throw new Error(`BOOTSTRAP REJECTED: Pending Super Admin invitation already exists for ${normalizedEmail} (Invitation ID: ${inv.id}).`);
      }

      // If Dry-Run, exit transaction without writing
      if (isDryRun) {
        console.log('✅ DRY-RUN VERIFICATION SUCCESSFUL:');
        console.log('   - Project ID matches approved project "onewill-academy-weekly-report".');
        console.log('   - Target email format is valid.');
        console.log('   - Atomic Sentinel Document ("system_config/bootstrap_sentinel") does not exist.');
        console.log('   - Database contains NO existing Super Admin accounts.');
        console.log('   - Database contains NO existing Super Admin invitations for target email.');
        console.log('   - [NO WRITES PERFORMED]. Re-run with --execute when ready to perform real write.');
        return;
      }

      // 5. Perform Real Write (Only when --execute flag is passed)
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiration
      const invitationRef = db.collection('invitations').doc();

      // Write Atomic Sentinel Document
      transaction.set(sentinelRef, {
        bootstrappedAt: now,
        targetEmail: normalizedEmail,
        projectId: project,
        invitationId: invitationRef.id,
      });

      const invitationDoc: FirestoreInvitationDocument = {
        id: invitationRef.id,
        normalizedEmail,
        role: 'SUPER_ADMIN',
        teamId: 'team-executive',
        invitedBy: 'SYSTEM_BOOTSTRAP_CLI',
        expiresAt,
        status: 'PENDING',
        createdAt: now,
      };

      transaction.set(invitationRef, invitationDoc);

      // 6. Write Audit Event in `audit_events`
      const auditRef = db.collection('audit_events').doc();
      const auditDoc = {
        eventId: auditRef.id,
        actor: 'SYSTEM_BOOTSTRAP_CLI',
        action: 'SUPER_ADMIN_BOOTSTRAP_INVITATION_CREATED',
        target: normalizedEmail,
        timestamp: now,
        metadata: {
          projectId: project,
          assignedRole: 'SUPER_ADMIN',
          invitationId: invitationRef.id,
          expiresAt,
        },
      };

      transaction.set(auditRef, auditDoc);

      console.log('🎉 REAL BOOTSTRAP EXECUTION SUCCESSFUL:');
      console.log(`   - Atomic Sentinel Document Created: system_config/bootstrap_sentinel`);
      console.log(`   - Invitation Document Created: invitations/${invitationRef.id}`);
      console.log(`   - Target Email: ${normalizedEmail}`);
      console.log(`   - Assigned Role: SUPER_ADMIN`);
      console.log(`   - Audit Event Recorded: audit_events/${auditRef.id}`);
    });
  } catch (err: any) {
    console.error(`❌ BOOTSTRAP TRANSACTION ERROR: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ UNHANDLED EXCEPTION:', err);
  process.exit(1);
});
