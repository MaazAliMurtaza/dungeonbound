"""Create an evidence-based report copy; never modify the supplied Word files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET
import argparse
import hashlib
import subprocess
import re
from xml.sax.saxutils import escape
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--native-passed', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'docs/source/Dungeonbound_Project_Report_Original.docx'
if not source.exists():
    source = next(root.parent.glob('*Dungeonbound_Project_Report.docx'))
expected = 'af5c8b587b6a15e3f5ec786245f75e5e62c937020725728161ce699efc94d17c'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('The supplied report changed; review it before applying paragraph replacements.')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
ET.register_namespace('w', ns['w'])
q = lambda name: '{' + ns['w'] + '}' + name
native = ('Passed: Android 11 low-end emulator, existing-save upgrade, skill prerequisites, mastery switch, accessory/Legendary equip, restart and eight-room guardian clear. Physical phone performance remains unverified.'
          if args.native_passed else 'Latest native walkthrough is not yet verified; do not claim a pass. Earlier floor/persistence checks are documented separately. Physical phone performance remains unverified.')
origin = subprocess.run(['git','config','--get','remote.origin.url'], cwd=root, capture_output=True, text=True).stdout.strip()
repo = 'Repository URL not established by this script.'
if origin.startswith('git@github.com:'):
    repo = 'https://github.com/' + origin.split(':', 1)[1].removesuffix('.git')
elif origin.startswith('https://'):
    parsed = urlsplit(origin)
    if parsed.hostname == 'github.com':
        repo = 'https://github.com' + parsed.path.removesuffix('.git')
head = subprocess.run(['git','rev-parse','--short','HEAD'], cwd=root, capture_output=True, text=True).stdout.strip()
updates = {
    4: 'Verified implementation supplement, 2026-11-07. This copy records implemented systems and actual local evidence. Outstanding physical-device/release checks and team-supplied history are identified explicitly. Original Word documents are preserved. Changes were Codex-assisted.',
    7: 'Dungeonbound is a React Native 2D turn-based roguelite RPG for Android, with Warrior, Ranger and Mage classes, six seeded dungeon floors, combat, events, treasure, equipment, XP, quests and persistent accounts. Low resource use is a design target; physical-device performance is not yet certified.',
    8: 'Game rules run locally. Express and PostgreSQL handle authentication, validated player saves and opt-in rankings. Local/cloud save conflicts require an explicit choice and retain candidate snapshots.',
    19: 'Implemented: expiring JWT access sessions, hashed rotating refresh sessions and SecureStore-only credential persistence.',
    28: 'Syed Muhammad Rayyan',
    29: 'Frontend / React Native - responsibility confirmed by project owner.',
    35: 'Game systems / QA - responsibility confirmed by project owner.',
    40: 'Statuses below reflect source review and recorded tests. Implemented is distinct from physical-device or release verification.',
    46: 'Implemented: three classes, Ranger speed-based evasion, pose-specific equipment layers, distinct Legendary outfits and multi-stage combat animation.',
    49: 'Implemented: six floors, eight seeded rooms per floor, valid linear start-to-boss sequence and varied room types.',
    52: 'Implemented: attack, guard, skills, flasks/ether, criticals, damage/status effects and victory/loss.',
    55: 'Implemented: ten regular enemy archetypes, elite and six named guardians; strike/heavy/guard/hex rules and boss enrage. Many share a rotation.',
    58: 'Implemented: weapon, armor and accessory slots, visible equipped weapons/armor, selling and Common/Rare/Epic/Legendary equipment. Twenty designed item types excluding relics/tomes.',
    61: 'Implemented: seeded XP/gold/item rewards and probability-based four-rarity loot. Catalog/stat and seeded frequency tests pass.',
    64: 'Implemented: leveling, fifteen class skills with prerequisite branches, and mutually exclusive Assault/Survival mastery with paid switching.',
    67: 'Implemented: twelve one-time contracts and twelve achievement triggers, including the proposal examples.',
    70: 'Implemented: per-user local/PostgreSQL saves, v1/v2-to-v3 migration, offline cold start, conflict backups and schema-downgrade protection. Standalone install/update/backup still unverified.',
    73: 'Implemented, optional: opt-in public aliases and score rankings. Not server-authoritative competitive anti-cheat.',
    83: 'Passed: exact known attack, defense, critical, piercing and guard outcomes in mobile/tests/proposal.test.mjs.',
    87: 'Passed: configured critical/evasion behavior across 30,000 deterministic seed samples; 1.6x critical power before armor.',
    91: 'Passed: 500 start-to-boss route seeds and current all-class six-floor campaign simulations.',
    95: 'Passed: 12,000 real treasure generations, rarity frequency bounds, all eighteen equipment templates reached, twenty-item catalog checks.',
    99: 'Passed automated campaign/reward tests. Native outcome: ' + native,
    103: 'Earlier session/offline/conflict persistence checks passed. Latest native result: ' + native,
    107: 'Passed: thirty live API checks on the updated home-network API, including v3 gear/mastery round trip, authorization, refresh/logout and rejected schema downgrade.',
    111: native,
    115: 'Passed: migration, malformed saves, prerequisites, equipped-item sales, mastery charging, save conflicts and exact combat regressions. Current mobile suite 48/48; backend 10/10; TypeScript passed. Cloud Linux validation also passed.',
    121: 'OPPO home screen stretched; fonts/titles clipped.',
    122: 'Absolute composition, landscape art crop and generic device font substitution.',
    123: 'Measured portrait layout, dedicated background, bundled Barlow fonts and responsive control widths.',
    124: 'Earlier native compact/tall enlarged-text checks passed; actual OPPO reload/performance confirmation pending.',
    125: 'Updated saves rejected through the home-network API.',
    126: 'A stale API process still owned port 4000 after listener-based restart attempts.',
    127: 'Replaced only the verified stale PID; added save-format health marker, schema-downgrade guard and explicit bind-error reporting.',
    128: 'Passed: API advertises saveVersion 3; thirty live API checks pass on 192.168.1.7:4000.',
    129: 'Expo Go bundle download stalled on Windows/Android.',
    130: 'Observed multipart-download ProtocolException; matching upstream report expo/expo#49111.',
    131: 'Windows Metro middleware requests normal JavaScript bundle responses; production game logic unchanged.',
    132: 'HTTP workaround verified (200/application/javascript); native status: ' + native,
    134: 'Evidence and failed attempts are recorded in PROPOSAL_IMPLEMENTATION_2026-11-07.md and dated verification notes. Screenshots alone do not prove FPS or battery use.',
    189: 'Balance classes, speed/evasion, masteries and the expanded loot economy using physical-device playtests.',
    192: 'Measure standalone launch time, memory, frame stalls, heat and battery on representative phones.',
    195: 'Leaderboard and explicit cloud conflict handling are implemented. Competitive anti-cheat and multiplayer remain outside the initial MVP.',
    200: repo,
    202: f'Report generated from source checkpoint {head or "not established"}; accompanying report/evidence updates are committed separately. Consult the repository main branch for the latest source. No Android release commit or APK is claimed.',
    204: 'Cloud Android build workflow is prepared; actual hosted HTTPS API access is required before a release build. No completed release APK/download link recorded by this report. See the dated local build log for actual build status; Expo Go is not a standalone APK.',
    206: 'Not recorded; supply an actual demo link if required.',
    208: 'Local evidence/: proposal-v3-tests.txt, proposal-v3-wifi-api-tests.txt, phone-v3-*.png; .project-docs/ contains dated audits and verification reports.',
    214: 'Frontend responsibility: Syed Muhammad Rayyan (confirmed by project owner). Individual commit/time evidence and percentages are not inferred.',
    216: 'Backend responsibility: Syed Ahmer Ali (confirmed by project owner). Individual commit/time evidence and percentages are not inferred.',
    218: 'Game systems responsibility: Maaz Ali Murtaza (confirmed by project owner). Individual commit/time evidence and percentages are not inferred. Codex-assisted changes are attributed separately.',
    220: 'The current implementation provides the proposal\'s main playable RPG loop, prerequisite trees, accessories, Legendary rarity, speed, distinct equipment art, original music/effects and optional device voice announcements. Automated tests and local API evidence pass. Physical performance, final release APK/hosting and truthful team timeline/contribution evidence remain separate completion tasks.',
}
with ZipFile(source) as original:
    original_xml = original.read('word/document.xml').decode('utf-8')
    document = ET.fromstring(original_xml)
    paragraphs = document.findall('.//w:body//w:p', ns)
    replacements = {}
    for index, paragraph in enumerate(paragraphs, 1):
        text = ''.join(t.text or '' for t in paragraph.findall('.//w:t', ns))
        replacement = updates.get(index)
        if replacement is None and (text.startswith('[Dates') or text in ['[Test results and bug IDs]', '[Build version and evidence]', 'Update']):
            replacement = 'Not established by available records; team to provide dated evidence.'
        if replacement is not None:
            replacements[index] = replacement
    # Preserve all original namespace declarations, relationships and formatting
    # markup. Reserializing the whole root can lose Word's Ignorable namespaces.
    paragraph_pattern = re.compile(r'<w:p(?:\s[^>]*?)?(?:\s*/>|>.*?</w:p>)', re.S)
    matches = list(paragraph_pattern.finditer(original_xml))
    assert len(matches) == len(paragraphs), 'Paragraph numbering changed; inspect the document.'
    counter = 0
    def replace_paragraph(match):
        global counter
        counter += 1
        replacement = replacements.get(counter)
        if replacement is None:
            return match.group(0)
        markup = match.group(0)
        opening = markup[:markup.index('>')+1].removesuffix('/>')
        if not opening.endswith('>'):
            opening += '>'
        properties = re.search(r'<w:pPr(?:\s[^>]*?)?(?:\s*/>|>.*?</w:pPr>)', markup, re.S)
        return opening + (properties.group(0) if properties else '') + '<w:r><w:t xml:space="preserve">' + escape(replacement) + '</w:t></w:r></w:p>'
    updated_xml = paragraph_pattern.sub(replace_paragraph, original_xml).encode('utf-8')
    ET.fromstring(updated_xml)
    destination = root / '.project-docs/Dungeonbound_Project_Report_Verified_2026-11-07.docx'
    with ZipFile(destination, 'w', ZIP_DEFLATED) as output:
        for item in original.infolist():
            output.writestr(item, updated_xml if item.filename == 'word/document.xml' else original.read(item.filename))
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
print('Verified report copy created; original unchanged: ' + str(destination))
