import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, csvObjects, importLinkedIn, parseWebsites, classifyFile } from '../js/linkedin.js';

test('CSV parser handles quotes, escaped quotes, newlines in fields, CRLF and BOM', () => {
  const rows = parseCSV('﻿a,b,c\r\n1,"two, with comma","three ""quoted"""\r\n"multi\nline",x,\r\n');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', 'two, with comma', 'three "quoted"'], ['multi\nline', 'x', '']]);
  const objs = csvObjects('Notes:\n"Some preamble"\nFirst Name,Last Name\nAda,Reyes\n', ['First Name']);
  assert.deepEqual(objs, [{ firstname: 'Ada', lastname: 'Reyes' }]);
});

test('file names are classified regardless of path and case', () => {
  assert.equal(classifyFile('Basic_LinkedInDataExport/Positions.csv'), 'positions');
  assert.equal(classifyFile('Email Addresses.csv'), 'emails');
  assert.equal(classifyFile('PhoneNumbers.csv'), 'phones');
  assert.equal(classifyFile('Connections.csv'), '');
});

test('websites field parses the bracketed LinkedIn form', () => {
  assert.deepEqual(parseWebsites('[PERSONAL:https://ada.example.com,OTHER:https://b.example]'), [
    { label: 'Personal', url: 'https://ada.example.com' }, { label: '', url: 'https://b.example' },
  ]);
});

test('a LinkedIn export becomes a resume with every recognised file mapped', () => {
  const files = [
    { name: 'Profile.csv', text: 'First Name,Last Name,Maiden Name,Address,Birth Date,Headline,Summary,Industry,Zip Code,Geo Location,Twitter Handles,Websites,Instant Messengers\nAda,Reyes,,,,Cloud Architect,"Builds platforms.\nLikes coffee.",Software,,"Santiago, Chile",adareyes,[PERSONAL:https://ada.example.com],\n' },
    { name: 'Positions.csv', text: 'Company Name,Title,Description,Location,Started On,Finished On\nNorthwind,Tech Lead,"Led the team.\n- Shipped X\n- Mentored Y",Santiago,Sep 2025,\nContoso,Engineer,Did things,Remote,Aug 2020,Apr 2022\n' },
    { name: 'Education.csv', text: 'School Name,Start Date,End Date,Notes,Degree Name,Activities\nUniversidad de Chile,2014,2018,Thesis on queues,B.S. Computer Science,Chess club\n' },
    { name: 'Skills.csv', text: 'Name\nKubernetes\nAWS\n' },
    { name: 'Languages.csv', text: 'Name,Proficiency\nSpanish,Native or bilingual proficiency\nEnglish,Full professional proficiency\n' },
    { name: 'Certifications.csv', text: 'Name,Url,Authority,Started On,Finished On,License Number\nAWS SA,https://credly.example/x,Amazon,Mar 2023,,ABC-1\n' },
    { name: 'Projects.csv', text: 'Title,Description,Url,Started On,Finished On\nNeorgon,"Hub of tools.\n- 60 sites",https://neorgon.com,2026,\n' },
    { name: 'Honors.csv', text: 'Title,Description,Issued On\nEngineer of the year,For shipping,2024\n' },
    { name: 'Email Addresses.csv', text: 'Email Address,Confirmed,Primary,Updated On\nold@example.com,Yes,No,2020\nada@example.com,Yes,Yes,2024\n' },
    { name: 'PhoneNumbers.csv', text: 'Extension,Number,Type\n,+56 9 1234 5678,Mobile\n' },
    { name: 'Connections.csv', text: 'Notes:\n"x"\nFirst Name,Last Name\nSomeone,Else\n' },
  ];
  const { model: m, warnings, report } = importLinkedIn(files);
  assert.deepEqual(warnings, []);
  assert.equal(m.basics.name, 'Ada Reyes');
  assert.equal(m.basics.title, 'Cloud Architect');
  assert.equal(m.basics.location, 'Santiago, Chile');
  assert.equal(m.basics.email, 'ada@example.com', 'primary email wins');
  assert.equal(m.basics.phone, '+56 9 1234 5678');
  assert.equal(m.basics.website, 'https://ada.example.com');
  assert.deepEqual(m.basics.links, [{ label: 'X', url: 'https://x.com/adareyes', icon: 'x' }]);
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
});

test('unrecognised input is refused with a message, not an empty resume', () => {
  const r = importLinkedIn([{ name: 'Connections.csv', text: 'a,b\n1,2' }]);
  assert.equal(r.model, null);
  assert.match(r.warnings[0], /No recognised LinkedIn CSV/);
});
