# SHIFT 1.0: AppSheet Direct Firestore Sync & Offline Secretariat Management

A streamlined, console-free data synchronization solution that connects Google AppSheet directly to Cloud Firestore, giving the event secretariat an offline-capable mobile attendee management app with zero Google Cloud Console dependencies.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Decisions from Clarifications:**
> - **Connection Method**: AppSheet connects directly to Cloud Firestore as a native data source. This completely bypasses the need for Google Cloud Console access, API enablement, or OAuth client configurations.
> - **Secretariat Primary Workflow**: Offline-capable attendee check-in and delegate management for event staff on mobile devices and tablets.
> - **Current App State**: Starting fresh in AppSheet, requiring exact data schemas, field type mappings, and an in-app setup assistant.

- **Firestore Check-In Schema Extension**: To support offline and mobile check-ins from AppSheet, we will add standard check-in tracking fields (`checkedIn`, `checkedInAt`, `checkedInBy`) to the Firestore registration schema and security rules so updates from AppSheet or the web console remain synchronized in real time.
- **Secretariat AppSheet Hub**: An integrated dashboard panel in the Secretariat Admin Console with one-click copyable configuration parameters, a pre-formatted AppSheet column definition table, and an interactive 4-step setup wizard.

---

### 1. Overview & Core Concept

- **What It Does**: Enables the SHIFT 1.0 Secretariat team to manage attendees, view live delegate lists, and perform QR/pass check-ins on mobile devices—even in low-connectivity event halls—by connecting Google AppSheet directly to the existing Cloud Firestore database (`registrations` collection).
- **Target Audience / Persona**: Event secretariat leads, registration desk volunteers, and venue ushers managing delegates at the SHIFT 1.0 Youth Summit.
- **Key Value**: Eliminates the blocker of missing Google Cloud Console permissions. AppSheet connects natively to Firestore using the event coordinator's Google account, delivering an enterprise-grade mobile app with offline synchronization in under 5 minutes.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Secretariat Setup Flow**:
   - The admin logs into the Secretariat Console (`/admin` with passcode).
   - In the "Data Synchronization & Integrations" section, the admin selects the new **"Google AppSheet (Offline Mobile App)"** tab.
   - The console presents the exact credentials and parameters needed for AppSheet:
     - **Project ID**: Pre-filled and copyable.
     - **Database ID**: `(default)` / active Firestore DB.
     - **Table / Collection**: `registrations`.
     - **Key Column**: `passId` (unique delegate identifier, e.g., `SHFT-1042-UENR`).
     - **Label Column**: `fullName`.
   - The admin clicks **"Launch AppSheet Setup Guide"** to open a guided drawer with step-by-step screenshots and field definitions.
2. **Mobile Check-In & Sync Flow**:
   - Event staff open the AppSheet app on their phones (iOS, Android, or mobile web).
   - Staff can search delegates by name, school/institution, or scan the delegate pass QR code.
   - Toggling the `checkedIn` status instantly records the check-in time and staff identifier.
   - Changes sync bidirectional with Cloud Firestore: when the device is offline, AppSheet queues edits locally and syncs automatically when signal is restored.
3. **Web Console Live Monitoring**:
   - The Secretariat Admin Console table updates in real time, displaying check-in statuses and live venue attendance counts alongside pass generation and CSV exports.

#### Visual Identity & Theme
- **Theme**: Deep slate background (`#0B0F19`), rich structural cards (`#111827`), hairline borders (`#1F2937`), and vibrant emerald/cyan accents (`#10B981` / `#06B6D4`) matching SHIFT 1.0's tech-forward brand.
- **Top Bar Contract**: Preserves the clean top navigation (`SHIFT 1.0` wordmark, summit sections, Secretariat lock button).
- **Zero-Pill Discipline**: Status labels rendered with quiet typography and separators (`Checked In · 10:24 AM`, `Pending Sync · Firestore Live`).
- **Tabular Figures**: Attendee counts, timestamps, and pass IDs formatted with `tabular-nums font-mono`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Firestore Data Source vs. Google Sheets API**
  - *Chosen Approach*: Connect AppSheet directly to Cloud Firestore as a native data source.
  - *Why*: The Google Sheets API is currently disabled in the GCP project and requires GCP Console Owner permissions. AppSheet has built-in Cloud Firestore connector support, requiring only standard Google account authorization at `appsheet.com` without touching the GCP console.
  - *Alternatives Considered*: Writing an Apps Script webhook or CSV proxy. Rejected because direct Firestore connection gives instant bidirectional sync and automatic offline SQLite caching on mobile.

- **Decision 2: Dedicated Check-In State in Registration Schema**
  - *Chosen Approach*: Explicitly formalize `checkedIn` (boolean), `checkedInAt` (ISO string or timestamp), and `checkedInBy` (string) in Firestore document data and `firebase-blueprint.json`.
  - *Why*: Allows AppSheet's UI to generate toggle buttons and QR barcode check-in actions while ensuring the web console reflects identical state.
  - *Alternatives Considered*: Separate check-in collection. Rejected because a single flat document per attendee is ideal for AppSheet table views and avoids relational join latency on mobile.

- **Decision 3: In-App Secretariat AppSheet Hub**
  - *Chosen Approach*: Build a dedicated "AppSheet Integration & Offline Sync" section inside `AdminConsole.tsx` with one-click copy fields, schema documentation, and CSV schema export.
  - *Why*: Prevents configuration errors during event morning setup when secretariat volunteers are configuring mobile devices.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

#### System Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHIFT 1.0 PLATFORM                              │
│                                                                        │
│   ┌───────────────────────────┐      ┌─────────────────────────────┐   │
│   │    Public Registration    │      │     Secretariat Console     │   │
│   │   (Web Portal / Passes)   │      │    (Admin / Live Monitor)   │   │
│   └─────────────┬─────────────┘      └──────────────┬──────────────┘   │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│         [ POST /api/register ]               [ /api/admin/* ]          │
│                 │                                   │                  │
│                 └─────────────────┬─────────────────┘                  │
│                                   ▼                                    │
│                    ┌─────────────────────────────┐                     │
│                    │    Google Cloud Firestore   │                     │
│                    │   Collection: registrations │                     │
│                    └──────────────┬──────────────┘                     │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ Direct Cloud Connection
                                    │ (Google Auth / Spark/Enterprise)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE APPSHEET CLOUD                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │   AppSheet Data Source Connector: Cloud Firestore              │   │
│   │   • Project: ai-studio-shift10beyondthe-...                    │   │
│   │   • Table: registrations                                       │   │
│   │   • Key: passId | Label: fullName                              │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ Bidirectional Offline Sync         │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │        SHIFT 1.0 Secretariat Mobile App (iOS / Android)        │   │
│   │   • Offline Delegate Search & List                             │   │
│   │   • 1-Tap Check-In (checkedIn = true)                          │   │
│   │   • Camera QR Code Scanner (matches passId)                    │   │
│   │   • Automatic offline queue & sync on reconnect                │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Data Model & AppSheet Column Mapping

| Firestore Field | AppSheet Column Type | Key / Label | Description |
| :--- | :--- | :--- | :--- |
| `passId` | **Text** | **Key** | Unique ticket code (e.g. `SHFT-1042-UENR`), scanned by QR |
| `fullName` | **Name** | **Label** | Attendee full name displayed as header |
| `email` | **Email** | Normal | Delegate contact email |
| `phone` | **Phone** | Normal | Contact phone number |
| `institution` | **Text** | Normal | University / School / Organization |
| `roleOrTrack` | **Enum** | Normal | Track (`Engineering`, `Design`, `Product`, `Research`, `Other`) |
| `checkedIn` | **Yes/No** | QuickEdit | Check-in toggle switch for event staff |
| `checkedInAt` | **DateTime** | Normal | Timestamp of check-in |
| `checkedInBy` | **Text** | Normal | Staff name or device identifier |
| `createdAt` | **DateTime** | Normal | Registration timestamp |

#### Component & Feature Plan
1. **`src/components/AppSheetIntegrationCard.tsx`**:
   - Interactive card in the Secretariat Console showing:
     - Project ID, Database ID, and Collection parameters with copy buttons.
     - Live count of registrations and checked-in attendees.
     - "AppSheet Setup Wizard" button opening a guided walkthrough.
     - "Export AppSheet Column Schema" for instant table structure reference.
2. **`src/components/AppSheetGuideModal.tsx`**:
   - 4-step illustrated guide:
     - Step 1: Sign in to AppSheet -> Add Data Source -> Select "Cloud Firestore".
     - Step 2: Input Project ID and choose `registrations`.
     - Step 3: Set `passId` as Key and `checkedIn` as QuickEdit.
     - Step 4: Install the AppSheet mobile app and scan the share link.
3. **`server.ts` & `src/lib/firebase.ts`**:
   - Ensure `checkedIn`, `checkedInAt`, `checkedInBy` are preserved and queryable.
   - Provide an optional `/api/admin/checkin` endpoint for instant barcode scanner guns or web check-in if staff prefer laptop stations alongside mobile devices.
4. **`firestore.rules` & `firebase-blueprint.json`**:
   - Update `firebase-blueprint.json` to include the check-in attributes.
   - Maintain strict validation for public registration while allowing authenticated secretariat and data source updates.
