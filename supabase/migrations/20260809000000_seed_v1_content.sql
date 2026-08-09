-- Seed v1 content: Units 1-5, 70 phrases total (11+16+14+10+19).
-- Draft, partially native-reviewed as of 2026-08-09 -- see docs/curriculum-phrases.md
-- for the authoritative version with full annotations; this file mirrors it.
--
-- Audio policy: Units 1, 3, 5 get native-speaker recordings (needs_audio = true).
-- Units 2 & 4 are text-pronunciation only, no recording needed (needs_audio = false).
-- audio_path is left null here -- populated in a later migration once files are
-- uploaded to the phrase-audio Storage bucket.
--
-- Every phrase still gets a creature (Learn-tier taming mechanic applies across
-- all units); for needs_audio = false phrases, the Learn tier shows pronunciation
-- text instead of a play button. Confirmed with Vinos 2026-08-09.

insert into units (number, slug, title) values
  (1, 'greetings', 'Greetings & Courtesy'),
  (2, 'family', 'Family & Kinship'),
  (3, 'mealtime', 'Mealtime Words'),
  (4, 'numbers', 'Numbers 1-10'),
  (5, 'actions', 'Action Commands & Routines');

-- Unit 1 -- Greetings & Courtesy (11, all needs_audio = true, all recorded except #11)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, true, v.notes
from units, (values
  (1, 'vanakkam', 'Hello', 'vanakkam', null),
  (2, 'eppadi-irukka', 'How are you? (peer/cousin)', 'eppadi irukka?', null),
  (3, 'eppadi-irukkeenga', 'How are you? (elder -- Paati/Thatha)', 'eppadi irukkeenga?', 'honorific -- own item, not a variant'),
  (4, 'nalla-irukken', 'I''m fine', 'nalla irukken', null),
  (5, 'aamaa', 'Yes', 'aamaa', null),
  (6, 'illa', 'No', 'illa', null),
  (7, 'nandri', 'Thank you', 'nandri', 'commonly said in English even at home; Tamil optional, either is fine'),
  (8, 'sorry', 'Sorry', 'sorry / mannikkanum', 'recorded -- register as used'),
  (9, 'poyttu-varen', 'Goodbye', 'poyttu varen', 'lit. "I''ll go and come" -- not word-for-word'),
  (10, 'iravu-vanakkam', 'Good night', 'iravu vanakkam', 'commonly said in English even at home; Tamil optional, either is fine'),
  (11, 'kaalai-vanakkam', 'Good morning', 'kaalai vanakkam', 'not yet recorded, not yet native-reviewed; commonly said in English even at home; Tamil optional, either is fine')
) as v(seq, slug, english, tamil, notes)
where units.slug = 'greetings';

-- Unit 2 -- Family & Kinship (16, all needs_audio = false, text-pronunciation only)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, false, v.notes
from units, (values
  (1, 'amma', 'Mom', 'amma', null),
  (2, 'appa', 'Dad', 'appa', null),
  (3, 'paati', 'Grandma', 'paati', 'also used for grandma''s/grandpa''s own sisters (grand-aunts), not just direct grandmother'),
  (4, 'thatha', 'Grandpa', 'thatha', 'also used for grandma''s/grandpa''s own brothers (grand-uncles), not just direct grandfather'),
  (5, 'anna', 'Older brother', 'anna', null),
  (6, 'akka', 'Older sister', 'akka', null),
  (7, 'thambi', 'Younger brother', 'thambi', null),
  (8, 'thangachi', 'Younger sister', 'thangachi', null),
  (9, 'mama', 'Mom''s brother (bonus)', 'mama', null),
  (10, 'athai', 'Dad''s sister (bonus)', 'athai', 'elder/younger split for Dad''s sisters still deferred to v1.1 (uncle-side split now covered by periyappa/chitappa)'),
  (11, 'periyappa', 'Dad''s elder brother (bonus)', 'periyappa', null),
  (12, 'periyamma', 'Dad''s elder brother''s wife (bonus)', 'periyamma', null),
  (13, 'chitappa', 'Dad''s younger brother (bonus)', 'chitappa', null),
  (14, 'chitti', 'Dad''s younger brother''s wife (bonus)', 'chitti', null),
  (15, 'en-amma', 'My mom (bonus, sentence-level)', 'en amma', 'possessive pattern: en = my'),
  (16, 'un-appa', 'Your dad (bonus, sentence-level)', 'un appa', 'possessive pattern: un = your')
) as v(seq, slug, english, tamil, notes)
where units.slug = 'family';

-- Unit 3 -- Mealtime Words (14, all needs_audio = true; #1-8 recorded, #9-14 not yet)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, true, v.notes
from units, (values
  (1, 'pasikkudhu', 'I''m hungry', 'pasikkudhu', 'opposite: pasika illa (item 9)'),
  (2, 'thanni-vaenum', 'I want water', 'thanni vaenum', null),
  (3, 'thanni-kodu', 'Give me water', 'thanni kodu', 'direct, not "please pass"'),
  (4, 'saapadu-vaenum', 'I want to eat', 'saapadu vaenum', 'corrected from earlier draft "saapida vaenum"; recorded as saapadu-vaenum'),
  (5, 'rusiyaa-irukku', 'Tastes good!', 'rusiyaa irukku', '"tastiya irukku" also fine, commonly used alternative'),
  (6, 'kaaramaa-irukka', 'Is it spicy?', 'kaaramaa irukka?', 'question form (-a) vs. item 5 statement form (-u): irukku = "it is" / irukka = "is it?"'),
  (7, 'pothum', 'I''m full / enough', 'pothum', 'contrast: innum konjam (item 8, want more), neraya (item 11, a lot)'),
  (8, 'innum-konjam', 'A little more, please', 'innum konjam', null),
  (9, 'pasika-illa', 'Not hungry (bonus, contrast)', 'pasika illa', 'opposite of pasikkudhu (item 1); not yet recorded'),
  (10, 'vaendam', 'Don''t want (bonus, contrast)', 'vaendam', 'opposite of vaenum (items 2, 4); not yet recorded'),
  (11, 'neraya', 'A lot / a lot more (bonus, contrast)', 'neraya', 'opposite of konjam (item 8); not yet recorded'),
  (12, 'idhu', 'This (bonus)', 'idhu', 'not yet recorded'),
  (13, 'adhu', 'That (bonus)', 'adhu', 'not yet recorded'),
  (14, 'idhu-enna', 'What is this? (bonus, sentence-level)', 'idhu enna?', 'pointing at food and asking what it is; builds on idhu (item 12); not yet recorded')
) as v(seq, slug, english, tamil, notes)
where units.slug = 'mealtime';

-- Unit 4 -- Numbers 1-10 (10, all needs_audio = false, text-pronunciation only)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, false, null
from units, (values
  (1, 'onnu', 'One', 'onnu'),
  (2, 'rendu', 'Two', 'rendu'),
  (3, 'moonu', 'Three', 'moonu'),
  (4, 'naalu', 'Four', 'naalu'),
  (5, 'anju', 'Five', 'anju'),
  (6, 'aaru', 'Six', 'aaru'),
  (7, 'ezhu', 'Seven', 'ezhu'),
  (8, 'ettu', 'Eight', 'ettu'),
  (9, 'onbadhu', 'Nine', 'onbadhu'),
  (10, 'pathu', 'Ten', 'pathu')
) as v(seq, slug, english, tamil)
where units.slug = 'numbers';

-- Unit 5 -- Action Commands & Routines (19, all needs_audio = true; #1-10 recorded, #11-19 not yet)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, true, v.notes
from units, (values
  (1, 'inga-vaa', 'Come here', 'inga vaa', 'contrast: po (item 11, go)'),
  (2, 'ukaaru', 'Sit down', 'ukaaru', 'corrected from earlier draft "utkaar"'),
  (3, 'saapdu', 'Eat', 'saapdu', 'question form: saaptiya? (item 14, did you eat?)'),
  (4, 'enthiri', 'Wake up', 'enthiri', 'corrected from earlier draft "ezhundhiru"; contrast: yenthi (item 12)'),
  (5, 'thoongu', 'Sleep', 'thoongu', null),
  (6, 'kai-kazhuvu', 'Wash your hands', 'kai kazhuvu', null),
  (7, 'brush-pannu', 'Brush your teeth', 'teeth brush pannu', 'locked: Tanglish form, not the formal "pல் thei"'),
  (8, 'povom', 'Let''s go', 'povom', 'question form: povoma? (item 13, shall we go?)'),
  (9, 'nillu', 'Wait', 'nillu', 'related: po (item 11, go), nada (item 15, walk)'),
  (10, 'satham-podaadhey', 'Be quiet', 'satham podaadhey', null),
  (11, 'po', 'Go (bonus, contrast)', 'po', 'opposite of vaa (item 1); not yet recorded'),
  (12, 'yenthi', 'Get up (bonus, contrast)', 'yenthi', 'contrast with enthiri (item 4); confirmed by Vinos, native speaker'),
  (13, 'povoma', 'Shall we go? (bonus, question form)', 'povoma?', 'question form of povom (item 8); not yet recorded'),
  (14, 'saaptiya', 'Did you eat? (bonus, question form)', 'saaptiya?', 'question form of saapdu (item 3); not yet recorded'),
  (15, 'nada', 'Walk (bonus)', 'nada', 'related to nillu (item 9), po (item 11); not yet recorded'),
  (16, 'yenga-pora', 'Where are you going? (bonus, sentence-level)', 'yenga pora?', 'first full-sentence item, previews Unit 6+ direction; not yet recorded'),
  (17, 'vaanga', 'Come (respectful, to elders) (bonus)', 'vaanga', 'respect pattern: pairs with inga vaa (item 1) -- add "-nga" when speaking to elders; not yet recorded'),
  (18, 'saapidunga', 'Please eat (respectful, to elders) (bonus)', 'saapidunga', 'respect pattern: pairs with saapdu (item 3); not yet recorded'),
  (19, 'azhaadhey', 'Don''t cry (bonus)', 'azhaadhey', 'negative-imperative pattern: pairs with satham podaadhey (item 10) -- "-aadhey" = don''t do it; not yet recorded')
) as v(seq, slug, english, tamil, notes)
where units.slug = 'actions';

-- Comprehension-check pairs: link each new pattern phrase to its clearest
-- contrast partner, for a quiz-style "which one?" check rather than a plain
-- side-by-side display.
update phrases set paired_phrase_id = (select id from phrases where slug = 'saapidunga')
where slug = 'saapdu';
update phrases set paired_phrase_id = (select id from phrases where slug = 'saapdu')
where slug = 'saapidunga';

update phrases set paired_phrase_id = (select id from phrases where slug = 'azhaadhey')
where slug = 'satham-podaadhey';
update phrases set paired_phrase_id = (select id from phrases where slug = 'satham-podaadhey')
where slug = 'azhaadhey';

-- Text callouts (plain language, no grammar jargon in the wording).
insert into tips (unit_id, phrase_id, title, body)
select u.id, p.id, 'Talking to elders',
  'With cousins and friends: saapdu (eat), vaa (come). With Paati, Thatha, and other elders, add "-nga": saapidunga, vaanga. It''s built-in respect.'
from units u, phrases p
where u.slug = 'actions' and p.slug = 'saapdu';

insert into tips (unit_id, phrase_id, title, body)
select u.id, p.id, 'Saying "don''t"',
  'Adding "-aadhey" to an action word means "don''t do it": satham podaadhey (don''t make noise), azhaadhey (don''t cry).'
from units u, phrases p
where u.slug = 'actions' and p.slug = 'satham-podaadhey';

insert into tips (unit_id, phrase_id, title, body)
select u.id, p.id, 'The Tamil "zh" sound',
  'The "zh" in kazhuvu isn''t an English sound -- it''s a special Tamil letter (ழ), not quite "l" and not quite "z". Listen to the recording closely rather than sounding it out from the spelling.'
from units u, phrases p
where u.slug = 'actions' and p.slug = 'kai-kazhuvu';

-- One creature per phrase, species by unit theme (placeholder geometry, not final art).
insert into creatures (phrase_id, species, color, level)
select p.id,
  case u.slug
    when 'greetings' then 'peacock'
    when 'family' then 'jasmine'
    when 'mealtime' then 'flame'
    when 'numbers' then 'horns'
    when 'actions' then 'otter'
  end,
  case when p.seq % 2 = 0 then 'teal' else 'marigold' end,
  p.seq
from phrases p
join units u on u.id = p.unit_id;
