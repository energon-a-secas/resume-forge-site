import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, csvObjects, csvTable, importLinkedIn, parseWebsites, classifyFile, COLUMNS, missingColumns } from '../js/linkedin.js';

test('CSV parser handles quotes, escaped quotes, newlines in fields, CRLF and BOM', () => {
  const rows = parseCSV('﻿a,b,c\r\n1,"two, with comma","three ""quoted"""\r\n"multi\nline",x,\r\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', 'two, with comma', 'three "quoted"'], ['multi\nline', 'x', '']]);
  const objs = csvObjects('Notes:\n"Some preamble"\nFirst Name,Last Name\nMarina,Costa\n', ['First Name']);
  assert.deepEqual(objs, [{ firstname: 'Marina', lastname: 'Costa' }]);
});

test('file names are classified regardless of path and case', () => {
  assert.equal(classifyFile('Basic_LinkedInDataExport/Positions.csv'), 'positions');
  assert.equal(classifyFile('Email Addresses.csv'), 'emails');
  assert.equal(classifyFile('PhoneNumbers.csv'), 'phones');
  assert.equal(classifyFile('Connections.csv'), '');
});

test('websites field parses the bracketed LinkedIn form', () => {
  assert.deepEqual(parseWebsites('[PERSONAL:https://marina.example.dev,OTHER:https://b.example]'), [
    { label: 'Personal', url: 'https://marina.example.dev' }, { label: '', url: 'https://b.example' },
  ]);
});

// The header rows of real LinkedIn exports, copied on 2026-11-02 (header rows only, no data) from
// exports published on GitHub: noahgoo/human-to-human DEMO/Basic_LinkedInDataExport_10-02-2026.zip
// (Profile, Profile Summary, Positions, Education, Skills, Languages, Certifications, PhoneNumbers,
// Volunteering), David-Fuq/PersonalPortfolio Basic_LinkedInDataExport_03-17-2026 (Honors, Email
// Addresses), mcaliman/mcaliman.github.io linkedin/, committed 2026-04-19 (Projects, Publications,
// Courses, Organizations), and Ganesh2006646/Personal-Rag-LLM-Chatbot, committed 2026-05-23 (Projects
// and Email Addresses again, identical). None began with a BOM. The fixture below was written from
// memory before this check and matched every one of them, so no synonym in js/linkedin.js changed.
// When LinkedIn renames a column, update the row here from a real export, not from memory.
const REAL_HEADERS = {
  'Profile.csv': 'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers',
  'Profile Summary.csv': 'Profile Summary',
  'Positions.csv': 'Company Name,Title,Description,Location,Started On,Finished On',
  'Education.csv': 'School Name,Start Date,End Date,Notes,Degree Name,Activities',
  'Skills.csv': 'Name',
  'Languages.csv': 'Name,Proficiency',
  'Certifications.csv': 'Name,Url,Authority,Started On,Finished On,License Number',
  'Projects.csv': 'Title,Description,Url,Started On,Finished On',
  'Honors.csv': 'Title,Description,Issued On',
  'Email Addresses.csv': 'Email Address,Confirmed,Primary,Updated On',
  'PhoneNumbers.csv': 'Extension,Number,Type',
  'Volunteering.csv': 'Company Name,Role,Cause,Started On,Finished On,Description',
  'Publications.csv': 'Name,Published On,Description,Publisher,Url',
  'Courses.csv': 'Name,Number',
  'Organizations.csv': 'Name,Description,Position,Started On,Finished On',
};

// importLinkedIn's own notes; normalizeResume adds "basics.name is empty" when no Profile.csv came.
const importerNotes = (warnings) => warnings.filter((w) => w !== 'basics.name is empty');

test('every column the importer reads is a header a real export carries', () => {
  const byKey = Object.fromEntries(Object.entries(REAL_HEADERS).map(([name, row]) => [classifyFile(name), row]));
  for (const [key, cols] of Object.entries(COLUMNS)) {
    assert.ok(byKey[key], `COLUMNS.${key} has no real header row in REAL_HEADERS; copy one from a real export`);
    const headers = csvTable(byKey[key]).headers;
    assert.deepEqual(missingColumns(headers, cols), [], `COLUMNS.${key} reads a column LinkedIn does not write`);
    for (const [field, names] of Object.entries(cols)) {
      assert.ok(headers.includes(names[0].toLowerCase().replace(/[^a-z0-9]/g, '')), `COLUMNS.${key}.${field}: the first name must be the real header, synonyms after it`);
    }
  }
});

test('a LinkedIn export becomes a resume with every recognised file mapped', () => {
  const files = [
    { name: 'Profile.csv', text: 'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\nMarina,Costa,,,,Cloud Platform Engineer,"Builds platforms.\nLikes coffee.",Software,,"Lisbon, Portugal",marinacosta,[PERSONAL:https://marina.example.dev],\n' },
    { name: 'Positions.csv', text: 'Company Name,Title,Description,Location,Started On,Finished On\nNorthwind,Tech Lead,"Led the team.\n- Shipped X\n- Mentored Y",Lisbon,Jan 2024,\nContoso,Engineer,Did things,Remote,Aug 2020,Apr 2022\n' },
    { name: 'Education.csv', text: 'School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversity of Lisbon,2010,2014,Thesis on queues,B.S. Computer Science,Chess club\n' },
    { name: 'Skills.csv', text: 'Name\nKubernetes\nAWS\n' },
    { name: 'Languages.csv', text: 'Name,Proficiency\nPortuguese,Native or bilingual proficiency\nEnglish,Full professional proficiency\n' },
    { name: 'Certifications.csv', text: 'Name,Url,Authority,Started On,Finished On,License Number\nAWS SA,https://credly.example/x,Amazon,Mar 2023,,ABC-1\n' },
    { name: 'Projects.csv', text: 'Title,Description,Url,Started On,Finished On\nRoute planner,"Bike routes for the coast.\n- 8k monthly users",https://marina.example.dev/routes,2023,\n' },
    { name: 'Honors.csv', text: 'Title,Description,Issued On\nEngineer of the year,For shipping,2024\n' },
    { name: 'Email Addresses.csv', text: 'Email Address,Confirmed,Primary,Updated On\nold@example.com,Yes,No,2020\nmarina@example.com,Yes,Yes,2024\n' },
    { name: 'PhoneNumbers.csv', text: 'Extension,Number,Type\n,+351 912 345 678,Mobile\n' },
    { name: 'Connections.csv', text: 'Notes:\n"x"\nFirst Name,Last Name\nSomeone,Else\n' },
  ];
  const { model: m, warnings, report } = importLinkedIn(files);
  assert.deepEqual(warnings, []);
  assert.equal(m.basics.name, 'Marina Costa');
  assert.equal(m.basics.title, 'Cloud Platform Engineer');
  assert.equal(m.basics.location, 'Lisbon, Portugal');
  assert.equal(m.basics.email, 'marina@example.com', 'primary email wins');
  assert.equal(m.basics.phone, '+351 912 345 678');
  assert.equal(m.basics.website, 'https://marina.example.dev');
  assert.deepEqual(m.basics.links, [{ label: 'X', url: 'https://x.com/marinacosta', icon: 'x' }]);
  const types = m.sections.map((s) => s.type);
  assert.deepEqual(types, ['text', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards']);
  const exp = m.sections[1].items;
  assert.equal(exp[0].company, 'Northwind');
  assert.equal(exp[0].end, 'Present', 'empty Finished On on a started role means Present');
  assert.equal(exp[0].summary, 'Led the team.');
  assert.deepEqual(exp[0].highlights, ['Shipped X', 'Mentored Y']);
  assert.equal(exp[1].end, 'Apr 2022');
  assert.equal(m.sections[2].items[0].notes, 'Thesis on queues Chess club');
  assert.equal(m.sections[4].style, 'tags');
  assert.deepEqual(m.sections[5].items.map((i) => i.score), [5, 4]);
  assert.equal(m.sections[6].items[0].id, 'ABC-1');
  assert.equal(m.sections[7].items[0].date, '2024');
  assert.equal(report.length, 10, 'Connections.csv is ignored, every other file reported');
  assert.deepEqual(report.filter((r) => r.missing.length), [], 'no column reported missing');
  for (const f of files) {
    if (REAL_HEADERS[f.name]) assert.equal(f.text.split('\n')[0], REAL_HEADERS[f.name], `${f.name} fixture uses the real header row`);
  }
});

test('the rest of the files map from their real headers', () => {
  const row = (name, data) => ({ name, text: `${REAL_HEADERS[name]}\n${data}\n` });
  const { model: m, warnings, report } = importLinkedIn([
    row('Volunteering.csv', 'Food Bank,Driver,Poverty Alleviation,Jan 2019,Dec 2020,"Weekend routes.\n- 40 families a week"'),
    row('Publications.csv', 'Queues in practice,Mar 2022,A field guide,ACM Queue,https://pub.example/q'),
    row('Courses.csv', 'Distributed Systems,CS-451'),
    row('Organizations.csv', 'CNCF,Ambassador program,Ambassador,2023,'),
  ]);
  assert.deepEqual(importerNotes(warnings), []);
  assert.deepEqual(report.map((r) => r.missing), [[], [], [], []]);
  const [vol, pub, courses, orgs] = m.sections;
  assert.deepEqual([vol.type, pub.type, courses.type, orgs.type], ['volunteer', 'publications', 'list', 'list']);
  assert.equal(vol.items[0].org, 'Food Bank');
  assert.equal(vol.items[0].role, 'Driver');
  assert.equal(vol.items[0].summary, 'Poverty Alleviation: Weekend routes.');
  assert.deepEqual(vol.items[0].highlights, ['40 families a week']);
  assert.equal(pub.items[0].title, 'Queues in practice');
  assert.equal(pub.items[0].publisher, 'ACM Queue');
  assert.equal(pub.items[0].date, 'Mar 2022');
  assert.equal(courses.items[0].text, 'Distributed Systems CS-451');
  assert.equal(orgs.items[0].text, 'CNCF, Ambassador');
});

test('a renamed column is named in the report and the warnings, and the rest still imports', () => {
  const renamed = REAL_HEADERS['Positions.csv'].replace('Started On', 'Start Month').replace('Location', 'Place');
  const { model: m, warnings, report } = importLinkedIn([
    { name: 'Basic_LinkedInDataExport/Positions.csv', text: `${renamed}\nNorthwind,Tech Lead,Led the team,Lisbon,Jan 2024,Mar 2025\n` },
    { name: 'Skills.csv', text: 'Skill Name\nKubernetes\n' },
  ]);
  assert.deepEqual(report, [
    { file: 'Positions.csv', rows: 1, missing: ['Location', 'Started On'] },
    { file: 'Skills.csv', rows: 1, missing: ['Name'] },
  ]);
  assert.deepEqual(importerNotes(warnings), [
    'Positions.csv has no "Location" or "Started On" column, so those fields were left blank. LinkedIn may have renamed them.',
    'Skills.csv has no "Name" column, so that field was left blank. LinkedIn may have renamed it.',
  ]);
  const exp = m.sections[0].items[0];
  assert.equal(exp.company, 'Northwind');
  assert.equal(exp.role, 'Tech Lead');
  assert.equal(exp.end, 'Mar 2025');
  assert.equal(exp.start, '', 'the renamed column comes in blank, not misread');
  assert.equal(exp.location, '');
});

test('a synonym satisfies the column, and an empty file is not reported as drift', () => {
  const { report, warnings, model: m } = importLinkedIn([
    { name: 'Positions.csv', text: 'Company Name,Title,Description,Location,Start Date,End Date\nNorthwind,Lead,,Lisbon,2024,2025\n' },
    { name: 'Honors.csv', text: '' },
  ]);
  assert.deepEqual(report, [{ file: 'Positions.csv', rows: 1, missing: [] }, { file: 'Honors.csv', rows: 0, missing: [] }]);
  assert.deepEqual(importerNotes(warnings), []);
  assert.equal(m.sections[0].items[0].start, '2024');
});

test('Profile Summary.csv fills the profile text only when Profile.csv has none', () => {
  const profile = (summary) => ({ name: 'Profile.csv', text: `${REAL_HEADERS['Profile.csv']}\nMarina,Costa,,,,Engineer,${summary},,,Lisbon,,,\n` });
  const about = { name: 'Profile Summary.csv', text: 'Profile Summary\n"Builds platforms.\nLikes coffee."\n' };
  const emails = { name: 'Email Addresses.csv', text: `${REAL_HEADERS['Email Addresses.csv']}\nmarina@example.com,Yes,Yes,2024\n` };
  const fallback = importLinkedIn([profile(''), about, emails]).model.sections[0];
  assert.equal(fallback.type, 'text');
  assert.equal(fallback.text, 'Builds platforms.\nLikes coffee.');
  assert.equal(importLinkedIn([profile('From Profile.csv'), about, emails]).model.sections[0].text, 'From Profile.csv');
  assert.equal(importLinkedIn([profile(''), { name: 'Profile Summary.csv', text: 'Profile Summary\n' }, emails]).model.sections.length, 0, 'an empty Profile Summary.csv adds nothing');
});

test('a profile without Email Addresses.csv says the email is blank', () => {
  const { model: m, warnings } = importLinkedIn([{ name: 'Profile.csv', text: `${REAL_HEADERS['Profile.csv']}\nMarina,Costa,,,,Engineer,,,,Lisbon,,,\n` }]);
  assert.equal(m.basics.email, '');
  assert.deepEqual(warnings, ['No Email Addresses.csv among the files, so the email is blank; add it in the editor.']);
  assert.deepEqual(importerNotes(importLinkedIn([{ name: 'Skills.csv', text: 'Name\nAWS\n' }]).warnings), [], 'no profile, no email note');
});

test('unrecognised input is refused with a message, not an empty resume', () => {
  const r = importLinkedIn([{ name: 'Connections.csv', text: 'a,b\n1,2' }]);
  assert.equal(r.model, null);
  assert.match(r.warnings[0], /No recognised LinkedIn CSV/);
});
