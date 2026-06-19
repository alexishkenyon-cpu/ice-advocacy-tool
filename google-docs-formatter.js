/**
 * FireICE Google Docs Formatter
 * Canva-like formatting tools for Google Docs
 *
 * HOW TO USE:
 * 1. Open your Google Doc
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Save (Ctrl+S) and give it a name like "FireICE Formatter"
 * 5. Refresh your Google Doc
 * 6. You'll see a new "FireICE Format" menu
 *
 * @license MIT
 * @see https://fireice.info
 */

// ============================================
// MENU SETUP
// ============================================

function onOpen() {
  const ui = DocumentApp.getUi();
  ui.createMenu('🔥 FireICE Format')
    .addSubMenu(ui.createMenu('📝 Headers & Titles')
      .addItem('Title - Large Bold', 'formatTitleLarge')
      .addItem('Section Header', 'formatSectionHeader')
      .addItem('Subsection Header', 'formatSubsectionHeader')
      .addItem('Quote Style Header', 'formatQuoteHeader'))
    .addSubMenu(ui.createMenu('🎨 Text Styles')
      .addItem('Highlight - Yellow', 'highlightYellow')
      .addItem('Highlight - Orange', 'highlightOrange')
      .addItem('Highlight - Blue', 'highlightBlue')
      .addItem('Highlight - Green', 'highlightGreen')
      .addItem('Highlight - Pink', 'highlightPink')
      .addSeparator()
      .addItem('Bold + Color - Red', 'boldRed')
      .addItem('Bold + Color - Blue', 'boldBlue')
      .addItem('Bold + Color - Green', 'boldGreen')
      .addItem('Bold + Color - Orange', 'boldOrange'))
    .addSubMenu(ui.createMenu('📦 Callout Boxes')
      .addItem('Info Box (Blue)', 'insertInfoBox')
      .addItem('Warning Box (Orange)', 'insertWarningBox')
      .addItem('Success Box (Green)', 'insertSuccessBox')
      .addItem('Alert Box (Red)', 'insertAlertBox')
      .addItem('Quote Box (Gray)', 'insertQuoteBox'))
    .addSubMenu(ui.createMenu('📋 Templates')
      .addItem('Press Release', 'insertPressReleaseTemplate')
      .addItem('Call Script', 'insertCallScriptTemplate')
      .addItem('Email Template', 'insertEmailTemplate')
      .addItem('Flyer/Poster', 'insertFlyerTemplate')
      .addItem('Know Your Rights Card', 'insertKYRTemplate'))
    .addSubMenu(ui.createMenu('📊 Layouts')
      .addItem('Two Column Layout', 'insertTwoColumns')
      .addItem('Three Column Layout', 'insertThreeColumns')
      .addItem('Contact Card', 'insertContactCard')
      .addItem('Divider Line', 'insertDivider')
      .addItem('Spacer', 'insertSpacer'))
    .addSubMenu(ui.createMenu('🎨 Color Schemes')
      .addItem('Apply FireICE Theme', 'applyFireICETheme')
      .addItem('Apply Professional Theme', 'applyProfessionalTheme')
      .addItem('Apply Urgent/Alert Theme', 'applyUrgentTheme')
      .addItem('Apply Community Theme', 'applyCommunityTheme'))
    .addSeparator()
    .addItem('❓ Help & Instructions', 'showHelp')
    .addToUi();
}

// ============================================
// COLOR CONSTANTS
// ============================================

const COLORS = {
  // FireICE Brand Colors
  fireRed: '#FF4136',
  fireOrange: '#FF851B',
  iceBlue: '#0074D9',

  // Functional Colors
  success: '#2ECC40',
  warning: '#FF851B',
  alert: '#FF4136',
  info: '#0074D9',

  // Neutral Colors
  darkGray: '#333333',
  mediumGray: '#666666',
  lightGray: '#AAAAAA',
  paleGray: '#F5F5F5',

  // Highlight Colors
  highlightYellow: '#FFFF00',
  highlightOrange: '#FFD700',
  highlightBlue: '#87CEEB',
  highlightGreen: '#90EE90',
  highlightPink: '#FFB6C1'
};

// ============================================
// HEADER & TITLE FORMATTING
// ============================================

function formatTitleLarge() {
  const selection = getSelectedText();
  if (!selection) return;

  const text = selection.getText();
  const style = {};
  style[DocumentApp.Attribute.BOLD] = true;
  style[DocumentApp.Attribute.FONT_SIZE] = 28;
  style[DocumentApp.Attribute.FOREGROUND_COLOR] = COLORS.darkGray;
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Montserrat';

  selection.setAttributes(style);
  showToast('Title formatting applied!');
}

function formatSectionHeader() {
  const selection = getSelectedText();
  if (!selection) return;

  const style = {};
  style[DocumentApp.Attribute.BOLD] = true;
  style[DocumentApp.Attribute.FONT_SIZE] = 18;
  style[DocumentApp.Attribute.FOREGROUND_COLOR] = COLORS.iceBlue;
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Montserrat';

  selection.setAttributes(style);
  showToast('Section header formatting applied!');
}

function formatSubsectionHeader() {
  const selection = getSelectedText();
  if (!selection) return;

  const style = {};
  style[DocumentApp.Attribute.BOLD] = true;
  style[DocumentApp.Attribute.FONT_SIZE] = 14;
  style[DocumentApp.Attribute.FOREGROUND_COLOR] = COLORS.mediumGray;
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Open Sans';

  selection.setAttributes(style);
  showToast('Subsection header formatting applied!');
}

function formatQuoteHeader() {
  const selection = getSelectedText();
  if (!selection) return;

  const style = {};
  style[DocumentApp.Attribute.ITALIC] = true;
  style[DocumentApp.Attribute.FONT_SIZE] = 16;
  style[DocumentApp.Attribute.FOREGROUND_COLOR] = COLORS.mediumGray;
  style[DocumentApp.Attribute.FONT_FAMILY] = 'Georgia';

  selection.setAttributes(style);
  showToast('Quote header formatting applied!');
}

// ============================================
// TEXT HIGHLIGHTING
// ============================================

function highlightYellow() {
  applyHighlight(COLORS.highlightYellow);
}

function highlightOrange() {
  applyHighlight(COLORS.highlightOrange);
}

function highlightBlue() {
  applyHighlight(COLORS.highlightBlue);
}

function highlightGreen() {
  applyHighlight(COLORS.highlightGreen);
}

function highlightPink() {
  applyHighlight(COLORS.highlightPink);
}

function applyHighlight(color) {
  const selection = getSelectedText();
  if (!selection) return;

  selection.setBackgroundColor(color);
  showToast('Highlight applied!');
}

// ============================================
// BOLD + COLOR STYLES
// ============================================

function boldRed() {
  applyBoldColor(COLORS.fireRed);
}

function boldBlue() {
  applyBoldColor(COLORS.iceBlue);
}

function boldGreen() {
  applyBoldColor(COLORS.success);
}

function boldOrange() {
  applyBoldColor(COLORS.fireOrange);
}

function applyBoldColor(color) {
  const selection = getSelectedText();
  if (!selection) return;

  const style = {};
  style[DocumentApp.Attribute.BOLD] = true;
  style[DocumentApp.Attribute.FOREGROUND_COLOR] = color;

  selection.setAttributes(style);
  showToast('Bold color applied!');
}

// ============================================
// CALLOUT BOXES
// ============================================

function insertInfoBox() {
  insertCalloutBox('ℹ️ INFO', COLORS.iceBlue, '#E3F2FD');
}

function insertWarningBox() {
  insertCalloutBox('⚠️ WARNING', COLORS.warning, '#FFF3E0');
}

function insertSuccessBox() {
  insertCalloutBox('✅ SUCCESS', COLORS.success, '#E8F5E9');
}

function insertAlertBox() {
  insertCalloutBox('🚨 ALERT', COLORS.alert, '#FFEBEE');
}

function insertQuoteBox() {
  insertCalloutBox('💬 QUOTE', COLORS.mediumGray, '#F5F5F5');
}

function insertCalloutBox(title, borderColor, bgColor) {
  const doc = DocumentApp.getActiveDocument();
  const cursor = doc.getCursor();

  if (!cursor) {
    showAlert('Please place your cursor where you want to insert the callout box.');
    return;
  }

  const element = cursor.getElement();
  const parent = element.getParent();

  // Create a 1x1 table for the callout box
  const table = doc.getBody().insertTable(doc.getBody().getChildIndex(parent) + 1, [[title + '\n\nYour content here...']]);

  // Style the table
  const cell = table.getCell(0, 0);
  cell.setBackgroundColor(bgColor);
  cell.setPaddingTop(10);
  cell.setPaddingBottom(10);
  cell.setPaddingLeft(15);
  cell.setPaddingRight(15);

  // Style the border (set all sides)
  table.setBorderColor(borderColor);
  table.setBorderWidth(2);

  // Style the title text
  const cellParagraph = cell.getChild(0).asParagraph();
  const text = cellParagraph.editAsText();
  text.setBold(0, title.length - 1, true);
  text.setForegroundColor(0, title.length - 1, borderColor);
  text.setFontSize(0, title.length - 1, 12);

  showToast('Callout box inserted!');
}

// ============================================
// TEMPLATES
// ============================================

function insertPressReleaseTemplate() {
  const template = `
═══════════════════════════════════════════════════════
                    PRESS RELEASE
═══════════════════════════════════════════════════════

FOR IMMEDIATE RELEASE
[Date]

CONTACT:
[Name]
[Phone]
[Email]

───────────────────────────────────────────────────────

                    [HEADLINE HERE]
          [Subheadline or key message here]

───────────────────────────────────────────────────────

[CITY, STATE] — [Opening paragraph: Who, what, when, where, why. Lead with the most newsworthy information.]

[Second paragraph: Expand on the key details. Include relevant context and background.]

[Quote paragraph:]
"[Insert powerful quote from spokesperson or community leader]," said [Name], [Title] of [Organization].

[Additional details paragraph: Statistics, supporting information, or additional context.]

[Call to action paragraph: What should people do? Include event details, website, or contact information.]

###

ABOUT [ORGANIZATION NAME]:
[Brief description of the organization, its mission, and its work.]

For more information, visit [website] or contact [name] at [email/phone].

═══════════════════════════════════════════════════════
`;
  insertTemplateText(template, 'Press Release template inserted!');
}

function insertCallScriptTemplate() {
  const template = `
┌─────────────────────────────────────────────────────┐
│                 📞 CALL SCRIPT                       │
└─────────────────────────────────────────────────────┘

WHO TO CALL: [Official Name]
PHONE: [Phone Number]
BEST TIME: [Morning/Afternoon]

────────────────────────────────────────────────────────

WHEN THEY ANSWER:

"Hello, my name is [YOUR NAME] and I'm a constituent from [CITY/ZIP CODE].

I'm calling to urge [OFFICIAL'S TITLE] [OFFICIAL'S NAME] to [ACTION YOU WANT THEM TO TAKE].

[REASON 1: Why this matters to you personally]

[REASON 2: Why this matters to the community]

[REASON 3: Specific ask or policy position]

I would appreciate if you could let me know the [official's title]'s position on this issue.

Thank you for your time."

────────────────────────────────────────────────────────

IF YOU GET VOICEMAIL:

Leave your name, city, phone number, and a brief message.

────────────────────────────────────────────────────────

AFTER YOUR CALL:

□ Log your call at [website/tracker]
□ Share the script with friends and family
□ Follow up if you don't hear back in [X] days

┌─────────────────────────────────────────────────────┐
│  Remember: Be polite, be brief, be persistent!      │
└─────────────────────────────────────────────────────┘
`;
  insertTemplateText(template, 'Call Script template inserted!');
}

function insertEmailTemplate() {
  const template = `
────────────────────────────────────────────────────────
                   ✉️ EMAIL TEMPLATE
────────────────────────────────────────────────────────

TO: [recipient@email.com]
SUBJECT: [Clear, specific subject line - include location if relevant]

────────────────────────────────────────────────────────

Dear [Title] [Last Name],

My name is [Your Name], and I am a [constituent/customer/community member] from [City, State]. I am writing to [express concern about / urge you to / request that you] [specific action or issue].

[PARAGRAPH 2: Personal connection]
This issue matters to me because [personal story or local impact]. [Include specific examples or data if available.]

[PARAGRAPH 3: The ask]
I respectfully request that you [specific action]. [Explain why this action is important and what positive outcomes it would create.]

[PARAGRAPH 4: Closing]
Thank you for your attention to this important matter. I look forward to hearing your response and learning about the steps you will take to address this issue.

Sincerely,

[Your Full Name]
[Your Address]
[Your City, State ZIP]
[Your Phone Number]
[Your Email]

────────────────────────────────────────────────────────
`;
  insertTemplateText(template, 'Email template inserted!');
}

function insertFlyerTemplate() {
  const template = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║              🔥 [EVENT/ACTION NAME] 🔥                ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║    📅 DATE: [Day, Month Date, Year]                   ║
║                                                       ║
║    🕐 TIME: [Start Time] - [End Time]                 ║
║                                                       ║
║    📍 LOCATION:                                       ║
║       [Venue Name]                                    ║
║       [Street Address]                                ║
║       [City, State ZIP]                               ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║              [MAIN MESSAGE OR CALL TO ACTION]         ║
║                                                       ║
║    ► [Key Point 1]                                    ║
║    ► [Key Point 2]                                    ║
║    ► [Key Point 3]                                    ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║    WHAT TO BRING:                                     ║
║    □ [Item 1]                                         ║
║    □ [Item 2]                                         ║
║    □ [Item 3]                                         ║
║                                                       ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║    📱 MORE INFO: [website or social media]            ║
║    ☎️ CONTACT: [phone or email]                       ║
║    #[Hashtag]                                         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝

[Organization logos and sponsors here]
`;
  insertTemplateText(template, 'Flyer template inserted!');
}

function insertKYRTemplate() {
  const template = `
╔═══════════════════════════════════════════════════════╗
║        🛡️ KNOW YOUR RIGHTS / CONOZCA SUS DERECHOS     ║
╚═══════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────┐
│ IF IMMIGRATION (ICE) COMES TO YOUR HOME:            │
│ SI INMIGRACIÓN (ICE) VIENE A SU CASA:               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ✋ DO NOT OPEN THE DOOR                             │
│    NO ABRA LA PUERTA                                │
│                                                     │
│ 🚫 You do not have to let them in without a        │
│    warrant signed by a JUDGE                        │
│    No tiene que dejarlos entrar sin una orden      │
│    firmada por un JUEZ                              │
│                                                     │
│ 🤐 You have the right to remain SILENT             │
│    Tiene derecho a permanecer en SILENCIO          │
│                                                     │
│ 📋 Ask them to slip the warrant under the door     │
│    Pida que deslicen la orden bajo la puerta       │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ IF YOU ARE STOPPED IN PUBLIC:                       │
│ SI LE PARAN EN PÚBLICO:                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🤐 You have the right to remain SILENT             │
│    Tiene derecho a permanecer en SILENCIO          │
│                                                     │
│ 📝 Say: "I wish to remain silent"                  │
│    Diga: "Deseo permanecer en silencio"            │
│                                                     │
│ 🚗 If driving, you must show license, registration │
│    Si conduce, debe mostrar licencia, registro     │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ EMERGENCY CONTACTS / CONTACTOS DE EMERGENCIA:       │
├─────────────────────────────────────────────────────┤
│ Immigration Hotline: [NUMBER]                       │
│ Legal Aid: [NUMBER]                                 │
│ Family Contact: [NAME & NUMBER]                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MEMORIZE YOUR EMERGENCY CONTACT NUMBER!             │
│ ¡MEMORICE SU NÚMERO DE CONTACTO DE EMERGENCIA!     │
└─────────────────────────────────────────────────────┘
`;
  insertTemplateText(template, 'Know Your Rights template inserted!');
}

function insertTemplateText(text, message) {
  const doc = DocumentApp.getActiveDocument();
  const cursor = doc.getCursor();

  if (cursor) {
    cursor.insertText(text);
  } else {
    doc.getBody().appendParagraph(text);
  }

  showToast(message);
}

// ============================================
// LAYOUTS
// ============================================

function insertTwoColumns() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const cursor = doc.getCursor();

  let insertIndex = 0;
  if (cursor) {
    const element = cursor.getElement();
    const parent = element.getParent();
    insertIndex = body.getChildIndex(parent) + 1;
  }

  const table = body.insertTable(insertIndex, [
    ['Column 1 Content\n\nAdd your content here...', 'Column 2 Content\n\nAdd your content here...']
  ]);

  // Style the table
  table.setBorderWidth(0);
  const row = table.getRow(0);
  row.getCell(0).setPaddingRight(15);
  row.getCell(1).setPaddingLeft(15);

  showToast('Two column layout inserted!');
}

function insertThreeColumns() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const cursor = doc.getCursor();

  let insertIndex = 0;
  if (cursor) {
    const element = cursor.getElement();
    const parent = element.getParent();
    insertIndex = body.getChildIndex(parent) + 1;
  }

  const table = body.insertTable(insertIndex, [
    ['Column 1\n\nContent...', 'Column 2\n\nContent...', 'Column 3\n\nContent...']
  ]);

  table.setBorderWidth(0);

  showToast('Three column layout inserted!');
}

function insertContactCard() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const cursor = doc.getCursor();

  let insertIndex = 0;
  if (cursor) {
    const element = cursor.getElement();
    const parent = element.getParent();
    insertIndex = body.getChildIndex(parent) + 1;
  }

  const table = body.insertTable(insertIndex, [
    ['👤 [NAME]\n[Title/Role]\n\n📍 [Address]\n📞 [Phone]\n✉️ [Email]\n🌐 [Website]']
  ]);

  // Style the table
  table.setBorderColor(COLORS.iceBlue);
  table.setBorderWidth(2);
  const cell = table.getCell(0, 0);
  cell.setBackgroundColor('#F8F9FA');
  cell.setPaddingTop(12);
  cell.setPaddingBottom(12);
  cell.setPaddingLeft(15);
  cell.setPaddingRight(15);

  showToast('Contact card inserted!');
}

function insertDivider() {
  const doc = DocumentApp.getActiveDocument();
  const cursor = doc.getCursor();

  const divider = '────────────────────────────────────────────────────────';

  if (cursor) {
    const paragraph = cursor.insertText('\n' + divider + '\n');
    paragraph.setForegroundColor(COLORS.lightGray);
  } else {
    const para = doc.getBody().appendParagraph(divider);
    para.editAsText().setForegroundColor(COLORS.lightGray);
  }

  showToast('Divider inserted!');
}

function insertSpacer() {
  const doc = DocumentApp.getActiveDocument();
  const cursor = doc.getCursor();

  if (cursor) {
    cursor.insertText('\n\n\n');
  } else {
    doc.getBody().appendParagraph('\n\n');
  }

  showToast('Spacer inserted!');
}

// ============================================
// COLOR SCHEMES
// ============================================

function applyFireICETheme() {
  applyTheme({
    title: COLORS.fireRed,
    headers: COLORS.iceBlue,
    body: COLORS.darkGray,
    accent: COLORS.fireOrange
  }, 'FireICE');
}

function applyProfessionalTheme() {
  applyTheme({
    title: '#1a1a2e',
    headers: '#16213e',
    body: '#333333',
    accent: '#0f3460'
  }, 'Professional');
}

function applyUrgentTheme() {
  applyTheme({
    title: '#d32f2f',
    headers: '#c62828',
    body: '#333333',
    accent: '#ff5722'
  }, 'Urgent');
}

function applyCommunityTheme() {
  applyTheme({
    title: '#2e7d32',
    headers: '#388e3c',
    body: '#333333',
    accent: '#7cb342'
  }, 'Community');
}

function applyTheme(colors, themeName) {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();

  // Apply to all paragraphs based on their style
  const paragraphs = body.getParagraphs();

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const heading = para.getHeading();

    if (heading === DocumentApp.ParagraphHeading.TITLE) {
      para.editAsText().setForegroundColor(colors.title);
    } else if (heading === DocumentApp.ParagraphHeading.HEADING1 ||
               heading === DocumentApp.ParagraphHeading.HEADING2) {
      para.editAsText().setForegroundColor(colors.headers);
    } else if (heading === DocumentApp.ParagraphHeading.HEADING3 ||
               heading === DocumentApp.ParagraphHeading.HEADING4) {
      para.editAsText().setForegroundColor(colors.accent);
    } else {
      para.editAsText().setForegroundColor(colors.body);
    }
  }

  showToast(themeName + ' theme applied!');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getSelectedText() {
  const selection = DocumentApp.getActiveDocument().getSelection();

  if (!selection) {
    showAlert('Please select some text first.');
    return null;
  }

  const elements = selection.getRangeElements();
  if (elements.length === 0) {
    showAlert('Please select some text first.');
    return null;
  }

  // Get the first selected element's text
  const element = elements[0];
  if (element.getElement().editAsText) {
    const text = element.getElement().editAsText();
    if (element.isPartial()) {
      return text.setAttributes(
        element.getStartOffset(),
        element.getEndOffsetInclusive(),
        {}
      ) ? {
        getText: () => text.getText().substring(element.getStartOffset(), element.getEndOffsetInclusive() + 1),
        setAttributes: (attrs) => text.setAttributes(element.getStartOffset(), element.getEndOffsetInclusive(), attrs),
        setBackgroundColor: (color) => text.setBackgroundColor(element.getStartOffset(), element.getEndOffsetInclusive(), color),
        setForegroundColor: (color) => text.setForegroundColor(element.getStartOffset(), element.getEndOffsetInclusive(), color),
        setBold: (bold) => text.setBold(element.getStartOffset(), element.getEndOffsetInclusive(), bold)
      } : null;
    } else {
      return {
        getText: () => text.getText(),
        setAttributes: (attrs) => text.setAttributes(attrs),
        setBackgroundColor: (color) => text.setBackgroundColor(color),
        setForegroundColor: (color) => text.setForegroundColor(color),
        setBold: (bold) => text.setBold(bold)
      };
    }
  }

  return null;
}

function showToast(message) {
  DocumentApp.getActiveDocument().getBody(); // Ensure we have access
  SpreadsheetApp ? SpreadsheetApp.getActiveSpreadsheet().toast(message) : null;
  // Note: Google Docs doesn't have toast, so we use a brief alert or just proceed
}

function showAlert(message) {
  DocumentApp.getUi().alert(message);
}

function showHelp() {
  const ui = DocumentApp.getUi();
  const helpText = `
🔥 FireICE Google Docs Formatter
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUICK START:
1. Select text, then choose a formatting option
2. Place cursor, then insert templates/layouts
3. Use color schemes to style your whole document

FEATURES:
• Headers & Titles - Professional text formatting
• Text Styles - Highlights and bold colors
• Callout Boxes - Info, warning, alert boxes
• Templates - Press release, call scripts, emails
• Layouts - Columns, contact cards, dividers
• Color Schemes - Pre-designed theme colors

TIPS:
• Select text BEFORE applying text styles
• Place cursor BEFORE inserting templates
• Templates are fully editable after insertion
• Color schemes affect heading styles

Need more help? Visit https://fireice.info

Made with ❤️ for community advocates
  `;

  ui.alert('Help & Instructions', helpText, ui.ButtonSet.OK);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Runs when the document is opened
 * Creates the custom menu
 */
function onInstall(e) {
  onOpen(e);
}
