"""Generate the final Word report from source facts and dated evidence.

Run with python-docx and Pillow installed. Original supplied reports are untouched.
Optional artifacts/share/status.json supplies verified deployment/build outcomes.
"""
from pathlib import Path
import sys
import json
import hashlib
from datetime import date
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'artifacts/report-tools'))
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

OUT = ROOT / 'docs/Dungeonbound_Final_Project_Report.docx'
STATUS = ROOT / 'artifacts/share/status.json'
status = json.loads(STATUS.read_text(encoding="utf-8-sig")) if STATUS.exists() else {}
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.27), Inches(11.69)
sec.top_margin = sec.bottom_margin = Inches(.75)
sec.left_margin = sec.right_margin = Inches(.8)
normal = doc.styles['Normal']
normal.font.name, normal.font.size = 'Calibri', Pt(11)
normal.paragraph_format.space_after = Pt(7)
normal.paragraph_format.line_spacing = 1.12
for style in ['Title', 'Heading 1', 'Heading 2']:
    doc.styles[style].font.name = 'Calibri'
    doc.styles[style].font.color.rgb = RGBColor.from_string('18354A')
header = sec.header.paragraphs[0]
header.text = 'DUNGEONBOUND  /  MOBILE APPLICATION DEVELOPMENT'
header.style = doc.styles['Caption']
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
footer.add_run('Dungeonbound  |  ')
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE'); footer._p.append(field)
doc.core_properties.title = 'Dungeonbound — Final Project Report'
doc.core_properties.subject = 'Android RPG implementation, architecture, testing and handover'
doc.core_properties.author = 'Syed Muhammad Rayyan; Maaz Ali Murtaza; Syed Ahmer Ali'

def p(text, style=None): return doc.add_paragraph(text, style)
def h(text, level=1): return doc.add_heading(text, level)
def page(title): doc.add_page_break(); h(title)
def table(headers, rows):
    t = doc.add_table(rows=1, cols=len(headers)); t.style = 'Light Shading Accent 1'
    for c, value in zip(t.rows[0].cells, headers): c.text = value
    for row in rows:
        for c, value in zip(t.add_row().cells, row): c.text = str(value)
    return t
def bullets(items):
    for text in items: p(text, 'List Bullet')

p('FINAL PROJECT REPORT', 'Subtitle')
doc.add_heading('DUNGEONBOUND', 0)
p('A Lightweight Procedurally Generated Mobile RPG', 'Subtitle')
p('Mobile Application Development • Android • React Native / Expo')
p('Prepared: November 12, 2026')
table(['Team member', 'Student ID', 'Confirmed responsibility'], [
    ('Syed Muhammad Rayyan', 'SE-23067', 'Frontend / React Native'),
    ('Maaz Ali Murtaza', 'SE-23092', 'Game systems / QA'),
    ('Syed Ahmer Ali', 'SE-23099', 'Backend / database')])
p('Course instructor: Ms. Tooba Siddiqui')
h('Project links', 2)
p('Public source: https://github.com/MaazAliMurtaza/dungeonbound')
p('APK releases: https://github.com/MaazAliMurtaza/dungeonbound/releases')
p('Code reading guide: docs/CODE_WALKTHROUGH.md')
p('Temporary hosting deadline: November 13, 2026, 12:00 noon Pakistan time (07:00 UTC).')
p('Evidence note: This report separates implemented functionality, recorded native screenshots, current automated checks and deployment verification. No FPS, battery, memory or physical-device performance figures are invented. Codex-assisted implementation and documentation are acknowledged.')

page('Abstract and report guide')
p('Dungeonbound is a single-player, portrait Android roguelite RPG. Players choose Warrior, Ranger or Mage, explore seeded dungeon rooms, fight turn-based battles, collect equipment, unlock skills and progress through six designed floors. The application combines local game rules with account-based persistence: React Native and Expo provide the mobile interface; Express provides authentication, save synchronization and optional rankings; PostgreSQL stores account and progression records.')
p('The implementation emphasizes reproducible gameplay, explicit save-conflict handling and separation of credentials from ordinary game data. Access and refresh credentials use Android SecureStore. Non-sensitive progress is cached in AsyncStorage and synchronized through authenticated API routes. The server validates complete save structures, rotates refresh sessions and uses parameterized database queries.')
p('Current local verification passed 48 mobile tests, 10 backend tests and TypeScript checking on November 12, 2026. Earlier native Android walkthroughs and screenshots are preserved as dated project evidence. Release and hosting results appear in the delivery section and are reported only when verified.')
h('Contents', 2)
for title in ['1. Problem, objectives and scope', '2. Requirements and implemented features', '3. System architecture and data design', '4. Game rules and progression', '5. Interface screenshots and visual evidence', '6. Authentication, persistence and security', '7. Testing and verification', '8. Delivery, installation and hosting', '9. Code walkthrough and team handover', '10. Limitations, future work and conclusion', 'References and evidence index']:
    p(title)

page('1. Problem, objectives and scope')
h('Problem statement', 2)
p('The project explores how a mobile RPG can provide strategic progression, varied dungeon encounters and persistent accounts through lightweight 2D presentation and local calculations. The challenge is to combine a coherent gameplay loop with reliable Android persistence and a secure account backend without requiring real-time multiplayer infrastructure.')
h('Objectives', 2)
bullets(['Deliver a complete class-selection → exploration → combat → rewards → progression loop.', 'Use seeded generation so gameplay failures can be reproduced and tested.', 'Support three distinct character classes, equipment, skills, contracts and achievements.', 'Keep authentication credentials in SecureStore and protect each user’s cloud save.', 'Allow previously authenticated players to continue from cached progress during an API outage.', 'Produce a directly installable Android preview and readable documentation for teammates.'])
h('Scope', 2)
p('The game includes six designed floors with eight rooms each, ten regular enemy archetypes plus elite encounters and named guardians, three equipment slots, four equipment rarities, fifteen class skills, Assault/Survival mastery and opt-in rankings. Dungeon variation occurs within designed room and content rules. The project does not claim an unlimited branching maze, multiplayer, server-authoritative combat or competitive anti-cheat.')
h('Development approach', 2)
p('The existing project was extended and verified incrementally. Pure game-state transformations are tested separately from UI presentation. Shared validation rules are reused by the server. Native walkthroughs cover integration and presentation; unit and API tests cover exact outcomes and failure conditions. Original proposal/report files are preserved in docs/source rather than overwritten.')

page('2. Requirements and implemented features')
table(['Requirement', 'Implementation and evidence'], [
    ('Character choice', 'Warrior, Ranger and Mage with distinct base HP, attack, defense, mana and speed.'),
    ('Dungeon exploration', 'Six floors; seeded eight-room start-to-guardian sequence with combat, elite, treasure, rest and event rooms.'),
    ('Turn-based combat', 'Attack, guard, class skills, flasks and ether; critical hits, evasion, damage/status rules and enemy intent.'),
    ('Equipment and loot', 'Weapon, armor and accessory slots; Common, Rare, Epic and Legendary; twenty catalog types excluding relics/tomes.'),
    ('Progression', 'XP/levels, fifteen class skills with prerequisites, mastery selection/switching and campaign progression.'),
    ('Objectives', 'Twelve one-time contracts and twelve achievement triggers; rewards cannot be claimed repeatedly.'),
    ('Persistence', 'Versioned local/cloud saves, migration of older saves, conflict snapshots and downgrade protection.'),
    ('Account security', 'bcrypt password hashing; expiring JWTs; hashed rotating refresh sessions; SecureStore credential persistence.'),
    ('Optional rankings', 'Opt-in alias and saved progression statistics; not an anti-cheat verified competition.'),
    ('Presentation', 'Portrait UI, equipment-dependent sprites, combat poses, original procedural audio and optional synthesized speech.')])
h('Quality goals', 2)
p('Readability, predictable state transitions and reliable saving are implementation goals. Low resource use is a design target. Screenshots and successful tests do not establish device-wide performance or energy consumption; those require measurement on representative physical phones.')

page('3. System architecture and data design')
p('The mobile game owns immediate gameplay decisions. The API owns identity, authorization and database access. The mobile application contains only the public API origin; PostgreSQL credentials and JWT signing secrets belong only to the backend environment.')
diagram = ROOT / 'artifacts/share/architecture.png'
diagram.parent.mkdir(parents=True, exist_ok=True)
im = Image.new('RGB', (1500, 760), '#f5f8fb'); draw = ImageDraw.Draw(im)
font_path = Path('C:/Windows/Fonts/calibri.ttf')
font = ImageFont.truetype(str(font_path), 29) if font_path.exists() else ImageFont.load_default()
small = ImageFont.truetype(str(font_path), 24) if font_path.exists() else ImageFont.load_default()
def box(rect, text):
    draw.rounded_rectangle(rect, radius=20, fill='white', outline='#204b66', width=4)
    draw.multiline_text((rect[0]+25, rect[1]+25), text, fill='#18354a', font=font, spacing=12)
box((45,70,655,265), 'ANDROID / EXPO + REACT NATIVE\nUI, game.ts, seeded game rules\nuseAdventure: persistence orchestration')
box((45,430,335,660), 'SecureStore\nAccess token\nRefresh token\nAccount identity')
box((365,430,655,660), 'AsyncStorage\nGame progress\nSave revisions\nConflict copies')
box((835,70,1455,265), 'NODE / EXPRESS API ON RENDER\nAuthentication and session validation\nValidated saves and optional rankings')
box((835,430,1455,660), 'SUPABASE POSTGRESQL\nPrivate dungeonbound schema\nusers / sessions / saves / leaderboard')
for x1,y1,x2,y2,label in [(655,165,835,165,'HTTPS'),(1145,265,1145,430,'Verified TLS'),(190,265,190,430,''),(510,265,510,430,'')]:
    draw.line((x1,y1,x2,y2), fill='#ad7b2b', width=6)
    draw.polygon([(x2,y2),(x2-10,y2-18),(x2+10,y2-18)] if x1==x2 else [(x2,y2),(x2-18,y2-10),(x2-18,y2+10)], fill='#ad7b2b')
    if label: draw.text((min(x1,x2)+12,min(y1,y2)+15),label,font=small,fill='#675326')
im.save(diagram)
doc.add_picture(str(diagram), width=Inches(6.5))
p('Figure 1. Logical application architecture. Credential stores and game-state stores have separate responsibilities.', 'Caption')
table(['Table', 'Purpose and relationship'], [('users','UUID primary key, unique email, password hash and creation time.'), ('sessions','User foreign key; refresh-token hash and expiry. Multiple sessions may belong to one user.'), ('saves','One row per user; JSONB progress, client revision and server update time.'), ('leaderboard','One optional public entry per user; alias, score, level, bosses and update time.')])

page('4. Game rules and progression')
h('Seeded generation', 2)
p('game.ts advances a deterministic pseudo-random state. The same seed and action sequence reproduce the same results. A floor begins at a start room, varies the middle encounters within the designed rules and ends with a guardian. Connectivity is maintained by the linear sequence. Deterministic tests exercise many seeds without depending on unpredictable runtime randomness.')
h('Combat state transitions', 2)
p('A combat command transforms a copied Game object. The rules check action availability, update resources, apply player damage/effects, resolve enemy behavior and record the outcome. The UI then renders the next state and plays a corresponding presentation sequence. Enemy strike/heavy/guard/hex intent gives the player information for choosing an action. Guardian enrage and status effects add variation; several enemies share a rotation rather than having unique AI algorithms.')
h('Progression and inventory', 2)
p('Rewards provide XP, currency and equipment. Equipment IDs link inventory items to weapon, armor and accessory slots. Purchasing and equipping enforce class, affordability, level and combat restrictions. Selling an equipped item is rejected. Skill learning checks prerequisite branches. Only one mastery is active, and switching costs currency. Contracts and achievements use recorded milestones and one-time claims to avoid duplicate rewards.')
h('Why this structure helps testing', 2)
p('Rule functions can be called without mounting a phone screen. Tests compare exact damage outcomes, check that state remains schema-valid, verify input immutability and simulate complete campaigns. Presentation remains separate: animations communicate the outcome but do not become the source of combat truth.')

screens = [
    ('redesign-login.png', 'Account entry', 'The account form starts authentication through the Express API.'),
    ('proposal-v3-legendary-home.png', 'Hunter headquarters', 'The hub presents character progression and routes into gameplay.'),
    ('proposal-v3-battle.png', 'Turn-based battle', 'HP, MP, enemy intent and the command deck support tactical decisions.'),
    ('proposal-v3-victory.png', 'Guardian outcome', 'The recorded native walkthrough reached its guardian completion state.'),
    ('proposal-v3-equipment.png', 'Equipment', 'The armory presents equipped items and inventory progression.'),
    ('proposal-v3-skill-tree.png', 'Skill prerequisites', 'The awakening tree shows prerequisite branches and learned skills.'),
    ('proposal-v3-mastery.png', 'Mastery', 'Assault and Survival specialization are mutually exclusive.'),
    ('phone-v3-home-compact.png', 'Compact layout', 'Recorded compact portrait layout evidence from the Android verification work.')]
for index in range(0,len(screens),2):
    page('5. Interface screenshots and visual evidence' if index == 0 else 'Interface evidence — continued')
    p('These are existing native Android captures from the November 7 verification work, not newly captured standalone-APK screenshots. Some walkthrough captures use controlled high-stat fixture saves to exercise later progression; they do not represent normal starting balance. Asset filenames prefixed “phone” are preserved evidence names and do not independently prove physical-device testing.')
    t=doc.add_table(rows=1,cols=2)
    for cell,(filename,title,caption) in zip(t.rows[0].cells,screens[index:index+2]):
        cell.paragraphs[0].add_run(title).bold=True
        path=ROOT/'evidence'/filename
        if path.exists():
            with Image.open(path) as shot: width,height=shot.size
            factor=min(2.85/width,6.35/height)
            cell.add_paragraph().add_run().add_picture(str(path),width=Inches(width*factor))
        cell.add_paragraph(f'Figure {2+screens.index((filename,title,caption))}. {caption}',style='Caption')
        cell.add_paragraph('Source: evidence/'+filename,style='Caption')

page('6. Authentication, persistence and security')
h('Authentication lifecycle', 2)
p('Registration validates credentials and hashes the password with bcrypt. Login creates a database session, an expiring JWT access token and a random refresh token. The database stores only the refresh-token hash. The mobile application stores tokens in expo-secure-store. Refresh requests rotate credentials; concurrent refresh operations share an in-flight operation. Logout revokes the session and clears SecureStore values, including during a network failure.')
h('Authorization and validation', 2)
p('Protected routes validate JWT algorithm, issuer, audience, subject and session ID, then check that the session is still active. Save access uses the authenticated account ID. SQL values are parameterized. The shared save schema rejects missing fields, malformed nested data, unsupported references and credential-like extra fields. Request limits, Helmet headers and bounded request bodies reduce common API abuse.')
h('Local and cloud progress', 2)
p('AsyncStorage contains non-sensitive progress, revisions and conflict snapshots. SecureStore contains credentials and remembered account identity. An unreachable API may restore the previously signed-in identity to access that account’s local save; a revoked session is not unlocked from cached identity. Divergent local/cloud progress requires an explicit choice rather than silently trusting the newest clock. Older save formats migrate to the current schema; newer progress cannot be replaced by a downgraded schema.')
h('Hosted database boundary', 2)
p('The hosted backend uses the private dungeonbound schema and verified TLS. Public Data API roles are denied access to game account/session tables. Database passwords and JWT signing secrets are backend environment values. Only the public HTTPS API origin is bundled into the Android application.')
h('Trust limitation', 2)
p('Combat runs on the client. The backend validates structure and ownership, but does not replay every combat action to prove a score. Rankings are opt-in saved progress records and should not be presented as cheat-proof competition.')

page('7. Testing and verification')
table(['Check', 'Result / scope'], [
    ('Mobile unit suite — Nov 12', '48/48 passed: combat, campaigns, saves, migrations, progression, URL validation, authentication and presentation calculations.'),
    ('Backend unit suite — Nov 12', '10/10 passed: credentials, tokens, save validation and database/TLS configuration.'),
    ('TypeScript — Nov 12', 'npm run typecheck passed.'),
    ('Expo dependency check — Nov 12', 'EXPO_OFFLINE=1 npm run doctor passed; Expo warns offline validation is less reliable.'),
    ('Historical native walkthrough', 'Recorded Android 11 emulator pass: old-save migration, skills/mastery, accessory/Legendary equip, restart and eight-room guardian clear.'),
    ('Historical integration / CI', 'Recorded Linux CI validates fresh migration and live API behavior; evidence and Actions links are retained in project documentation.'),
    ('New hosted API', status.get('apiVerification','Pending verification in this report generation.')),
    ('New standalone APK', status.get('apkVerification','Pending build/installation verification in this report generation.')),
    ('Physical-device performance', 'No measured performance certification or new physical-phone installation result claimed.')])
h('Important regression cases', 2)
bullets(['Known attack, defense, critical, piercing and guard calculations produce exact outcomes.', 'Class campaigns complete across deterministic seed samples and progression choices.', 'Equipment transactions cannot sell equipped gear or duplicate currency.', 'Malformed saves, unknown sensitive keys and unsupported schema downgrades are rejected.', 'An unsent local adventure is retained when a newer cloud clock would otherwise replace it.', 'Network failure, revoked sessions and concurrent refresh operations follow distinct safe paths.'])
h('Issues resolved in recorded development', 2)
p('Recorded fixes include responsive portrait composition and bundled fonts for clipped layouts, a Windows Expo Go bundle-response workaround, replacement of a verified stale API listener, and a database URL regression guard preventing SSL/search-path URL parameters from overriding verified server configuration. Consult the dated verification notes for actual reproduction details and limits.')

page('8. Delivery, installation and hosting')
h('Current delivery status', 2)
p('Repository visibility: public, verified through GitHub on November 12, 2026. The history scan inspected 295 historical blobs and found no credential filenames or known secret signatures. A signature scan cannot guarantee the absence of every possible secret.')
p('API origin: '+status.get('apiUrl','Not yet verified at report generation.'))
p('APK download: '+status.get('apkUrl','No completed APK download verified at report generation; check the releases page for subsequent updates.'))
p('Hosting shutdown: '+status.get('shutdown','Requested deadline is November 13, 2026 at 12:00 noon Asia/Karachi; automatic provider suspension is not yet verified.'))
if status.get('apkSha256'): p('APK SHA-256: '+status['apkSha256'])
h('Build process', 2)
p('The game uses Expo. The prepared GitHub workflow installs locked mobile dependencies, validates the HTTPS API origin, runs TypeScript and mobile tests, performs Expo prebuild, and assembles a release-variant internal-preview APK with bundled JavaScript/assets. It targets ARM64 and x86_64 in the prepared workflow. Preview signing is intended for direct testing, not Play Store publication. EAS preview configuration is also included as an alternative build route.')
h('Teammate installation', 2)
bullets(['Download the completed .apk from the published release and compare its checksum when supplied.', 'Transfer the APK to the Android phone and open it with Files or the browser download view.', 'If Android prompts, allow installation from that source, install, then turn that allowance off if desired.', 'Open Dungeonbound, register or sign in while the API is available, choose a class and begin the adventure.', 'Keep the app installed to retain its local cache. Do not assume uninstall/reinstall preserves progress; Android backup is disabled.', 'After temporary hosting ends, new sign-ins, registration, cloud synchronization and rankings require hosting to resume. Previously authenticated offline progress remains subject to the implemented cached-session rules.'])
h('Compatibility and acceptance', 2)
p('The produced APK’s actual manifest, ABI list, signature and bundled assets should be checked before distribution. Successful packaging alone does not prove successful installation or physical-device operation. Install/update testing must preserve existing saves and use a consistent signing identity.')

page('9. Code walkthrough and team handover')
table(['Read in this order', 'What it explains'], [('mobile/src/game.ts','Game state, deterministic random sequence, combat, rooms, rewards and progression.'), ('mobile/src/content.ts and items.ts','Designed floors, enemy/skill/shop data and equipment catalog.'), ('mobile/App.tsx and src/GameWorld.tsx','User actions, screen routing, home/dungeon UI and presentation.'), ('mobile/src/useAdventure.ts','Account hydration, local writes, cloud synchronization and conflicts.'), ('mobile/src/auth.ts and saves.ts','SecureStore credentials, refresh/logout and revision reconciliation.'), ('mobile/src/state-schema.js','Strict shared validation and versioned save contract.'), ('server/src/server.js','Routes, authorization, transactions and ranking records.'), ('server/db/schema.sql and src/db-config.js','Data relationships, private schema and TLS configuration.')])
h('Trace an attack', 2)
p('The command deck triggers the handler in App.tsx. The handler calls combatAction with the current state and selected action. game.ts calculates the next state. useAdventure.update records a new local revision, React renders the result, and persistence writes the state locally before trying the cloud. Animation and sound describe the outcome; they do not decide the damage.')
h('Suggested collaboration workflow', 2)
p('Clone the repository, create a branch, make a focused change and open a pull request. Include reproduction steps and a seed for gameplay bugs. Run the relevant mobile/backend tests before review. Review rule changes together with save-schema changes so old saves remain compatible. Keep real .env files, tokens, databases and signing keys out of Git.')
h('Team attribution', 2)
p('Confirmed responsibilities are frontend for Syed Muhammad Rayyan, backend/database for Syed Ahmer Ali, and game systems/QA for Maaz Ali Murtaza. These role assignments do not fabricate individual commit counts, dates or contribution percentages. Codex-assisted code, artwork/audio workflows, verification and documentation should remain attributed as such.')
p('A separate beginner-friendly guide is supplied at docs/CODE_WALKTHROUGH.md, including common viva questions and local commands.')

page('10. Limitations, future work and conclusion')
h('Limitations', 2)
bullets(['The game requires an online first sign-in; cached offline access is not anonymous first-launch play.', 'Temporary API availability limits new sign-ins and synchronization after the demonstration window.', 'The prepared preview APK uses internal preview signing; store publication needs a production signing/release process.', 'Physical-device FPS, battery, thermal behavior and memory use have not been measured here.', 'Gameplay and scores are client-side; the leaderboard is not server-authoritative anti-cheat.', 'Several enemies share rule rotations, and dungeon variety remains bounded by designed content.', 'Cross-device conflicts require player choice; device-local conflict copies are not a full backup/export system.'])
h('Future improvements', 2)
p('Priorities include measured device profiling, broader phone compatibility and update tests, gameplay balance playtests, a durable production signing process, explicit save export/restore, more distinctive enemy behavior and server-side score verification if competitive rankings become a requirement. Hosting can be resumed independently of local game-rule development.')
h('Conclusion', 2)
p('Dungeonbound implements the project’s central Android RPG loop with deterministic combat/exploration, class progression, equipment, prerequisite skills, persistent accounts and explicit local/cloud save handling. Automated checks and preserved native evidence support the implemented behavior. Delivery claims remain tied to verified APK and deployment results rather than build configuration alone. The public repository, Word report and code guide provide a basis for teammate testing, review and continued development.')

page('References and evidence index')
for text in ['Project source: https://github.com/MaazAliMurtaza/dungeonbound', 'Expo documentation: https://docs.expo.dev/', 'Expo SecureStore: https://docs.expo.dev/versions/latest/sdk/securestore/', 'React Native documentation: https://reactnative.dev/docs/getting-started', 'Render deployments: https://render.com/docs/deploys', 'Render environment variables: https://render.com/docs/configure-environment-variables', 'Supabase PostgreSQL connections: https://supabase.com/docs/guides/database/connecting-to-postgres', 'PostgreSQL documentation: https://www.postgresql.org/docs/']:
    p(text)
table(['Local evidence', 'Description'], [('mobile/tests/','48-test mobile regression suite at the reported source state.'), ('server/tests/','Backend unit suite and authenticated API integration script.'), ('evidence/proposal-v3-native-final.txt','Recorded final native proposal walkthrough.'), ('evidence/proposal-v3-*.png','Progression/combat UI evidence used in this report.'), ('.project-docs/DEPLOYMENT_VERIFICATION_2026-11-07.md','Earlier deployment/native evidence and limitations.'), ('.project-docs/TEAM_ROLES.md','Owner-confirmed role allocation.'), ('docs/source/','Preserved original project proposal and report.'), ('docs/CODE_WALKTHROUGH.md','Code reading order, flow explanations and viva guide.')])
p('Report generation is reproducible with scripts/create-final-report.py. The original supplied Word files are preserved. Optional artifacts/share/status.json supplies verified release details without storing credentials.')

OUT.parent.mkdir(parents=True,exist_ok=True)
doc.save(OUT)
with ZipFile(OUT) as z:
    assert z.testzip() is None
    pictures=[name for name in z.namelist() if name.startswith('word/media/')]
    assert len(pictures)>=9, 'Expected architecture and eight screenshots'
print(json.dumps({'report':str(OUT),'bytes':OUT.stat().st_size,'embeddedImages':len(pictures),'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest()},indent=2))
