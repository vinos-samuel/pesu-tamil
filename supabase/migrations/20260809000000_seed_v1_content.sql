-- Seed v1 content: Units 1-5, 62 phrases total (11+14+11+10+16).
-- Draft, partially native-reviewed as of 2026-08-09 -- see docs/curriculum-phrases.md
-- for the authoritative version with full annotations; this file mirrors it.
--
-- Audio policy: Units 1, 3, 5 get native-speaker recordings (needs_audio = true).
-- Units 2 & 4 are text-pronunciation only, no recording needed (needs_audio = false).
-- audio_path is left null here -- populated in a later migration once files are
-- uploaded to the phrase-audio Storage bucket.
--
-- Every phrase still gets a creature (Learn-tier taming mechanic applies across
-- all units); for needs_audio = false phrases, the Learn tier is assumed to show
-- pronunciation text instead of a play button -- flagged as an assumption, not
-- yet confirmed with Vinos.

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

-- Unit 2 -- Family & Kinship (14, all needs_audio = false, text-pronunciation only)
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
  (14, 'chitti', 'Dad''s younger brother''s wife (bonus)', 'chitti', null)
) as v(seq, slug, english, tamil, notes)
where units.slug = 'family';

-- Unit 3 -- Mealtime Words (11, all needs_audio = true; #1-8 recorded, #9-11 not yet)
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
  (11, 'neraya', 'A lot / a lot more (bonus, contrast)', 'neraya', 'opposite of konjam (item 8); not yet recorded')
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

-- Unit 5 -- Action Commands & Routines (16, all needs_audio = true; #1-10 recorded, #11-16 not yet)
insert into phrases (unit_id, seq, slug, english, tamil_romanized, needs_audio, notes)
select id, v.seq, v.slug, v.english, v.tamil, true, v.notes
from units, (values
  (1, 'inga-vaa', 'Come here', 'inga vaa', 'contrast: po (item 11, go)'),
  (2, 'ukaaru', 'Sit down', 'ukaaru', 'corrected from earlier draft "utkaar"'),
  (3, 'saapdu', 'Eat', 'saapdu', 'question form: saaptiya? (item 14, did you eat?)'),
  (4, 'enthiri', 'Wake up', 'enthiri', 'corrected from earlier draft "ezhundhiru"; contrast: yenthi (item 12, unconfirmed)'),
  (5, 'thoongu', 'Sleep', 'thoongu', null),
  (6, 'kai-kazhuvu', 'Wash your hands', 'kai kazhuvu', null),
  (7, 'brush-pannu', 'Brush your teeth', 'teeth brush pannu', 'locked: Tanglish form, not the formal "pல் thei"'),
  (8, 'povom', 'Let''s go', 'povom', 'question form: povoma? (item 13, shall we go?)'),
  (9, 'nillu', 'Wait', 'nillu', 'related: po (item 11, go), nada (item 15, walk)'),
  (10, 'satham-podaadhey', 'Be quiet', 'satham podaadhey', null),
  (11, 'po', 'Go (bonus, contrast)', 'po', 'opposite of vaa (item 1); not yet recorded'),
  (12, 'yenthi', 'Get up (bonus, contrast)', 'yenthi', 'unconfirmed spelling/meaning -- contrast with enthiri (item 4) -- confirm with native speaker before recording'),
  (13, 'povoma', 'Shall we go? (bonus, question form)', 'povoma?', 'question form of povom (item 8); not yet recorded'),
  (14, 'saaptiya', 'Did you eat? (bonus, question form)', 'saaptiya?', 'question form of saapdu (item 3); not yet recorded'),
  (15, 'nada', 'Walk (bonus)', 'nada', 'related to nillu (item 9), po (item 11); not yet recorded'),
  (16, 'yenga-pora', 'Where are you going? (bonus, sentence-level)', 'yenga pora?', 'first full-sentence item, previews Unit 6+ direction; not yet recorded')
) as v(seq, slug, english, tamil, notes)
where units.slug = 'actions';

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
