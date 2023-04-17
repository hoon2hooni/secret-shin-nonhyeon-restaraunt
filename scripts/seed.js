/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {Pool} = require('pg');
const {readdir, unlink, writeFile} = require('fs/promises');
const startOfYear = require('date-fns/startOfYear');
const credentials = require('../credentials');

const NOTES_PATH = './notes';
const pool = new Pool(credentials);

const now = new Date();
const startOfThisYear = startOfYear(now);
// Thanks, https://stackoverflow.com/a/9035732
function randomDateBetween(start, end) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

const dropTableStatement = 'DROP TABLE IF EXISTS notes;';
const createTableStatement = `CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  title TEXT,
  body TEXT
);`;
const insertNoteStatement = `INSERT INTO notes(title, body, created_at, updated_at)
  VALUES ($1, $2, $3, $3)
  RETURNING *`;
const seedData = [
  [
    '반피차이',
    '신논현역 맛집...태국 음식 아주 굿 대박이에용~!',
    randomDateBetween(startOfThisYear, now),
  ],
  [
    '프로티너',
    `다이어트와 맛을 동시에 ..이것 못참지 프로티너 신논현역 맛집 강추합니다~! 
    유명 트레이너도 우연히 봤어용..`,
    randomDateBetween(startOfThisYear, now),
  ],
  [
    '수퍼두퍼',
    `햄버거 맛집 신논현역 맛집 수퍼두퍼 추천용~!
이제 쉨쉨 손절 타이밍임~!`,
    randomDateBetween(startOfThisYear, now),
  ],
  ['라멘모토', '오늘 점심은 츠케멘... 넘 맛나겠죵~', now],
];

async function seed() {
  await pool.query(dropTableStatement);
  await pool.query(createTableStatement);
  const res = await Promise.all(
    seedData.map((row) => pool.query(insertNoteStatement, row))
  );

  const oldNotes = await readdir(path.resolve(NOTES_PATH));
  await Promise.all(
    oldNotes
      .filter((filename) => filename.endsWith('.md'))
      .map((filename) => unlink(path.resolve(NOTES_PATH, filename)))
  );

  await Promise.all(
    res.map(({rows}) => {
      const id = rows[0].id;
      const content = rows[0].body;
      const data = new Uint8Array(Buffer.from(content));
      return writeFile(path.resolve(NOTES_PATH, `${id}.md`), data, (err) => {
        if (err) {
          throw err;
        }
      });
    })
  );
}

seed();
