-- 0018_regions_districts.sql
-- Canonical Ghana administrative reference tables. users.region/district and
-- listings.region/district store free-text values (e.g. 'Greater Accra', 'Ga East');
-- these tables catalog every region and district so the frontend can drive its
-- region -> district cascading pickers from the DB instead of hardcoded lists.
-- The "district is in the region" mapping is the districts.region_id foreign key.
CREATE TABLE IF NOT EXISTS regions (
  id            TEXT PRIMARY KEY,               -- normalized key, e.g. 'greater accra'
  name          TEXT NOT NULL UNIQUE,           -- display name, e.g. 'Greater Accra'
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO regions (id, name, display_order)
VALUES
  ('greater accra', 'Greater Accra', 1),
  ('ashanti',       'Ashanti',       2),
  ('central',       'Central',       3),
  ('eastern',       'Eastern',       4),
  ('western',       'Western',       5),
  ('western north', 'Western North', 6),
  ('northern',      'Northern',      7),
  ('savannah',      'Savannah',      8),
  ('north east',    'North East',    9),
  ('upper east',    'Upper East',    10),
  ('upper west',    'Upper West',    11),
  ('volta',         'Volta',         12),
  ('oti',           'Oti',           13),
  ('bono',          'Bono',          14),
  ('bono east',     'Bono East',     15),
  ('ahafo',         'Ahafo',         16)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS districts (
  id            TEXT PRIMARY KEY,               -- normalized key + name, e.g. 'ga east'
  region_id     TEXT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                  -- display name, e.g. 'GA East'
  display_order INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (region_id, name)
);

CREATE INDEX IF NOT EXISTS idx_districts_region_active ON districts (region_id, active, display_order, id);

-- Greater Accra (29)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('ablekuma-central',  'greater accra', 'Ablekuma Central', 1),
  ('ablekuma-north',    'greater accra', 'Ablekuma North',   2),
  ('ablekuma-west',     'greater accra', 'Ablekuma West',    3),
  ('accra',             'greater accra', 'Accra',            4),
  ('ada-east',          'greater accra', 'Ada East',         5),
  ('ada-west',          'greater accra', 'Ada West',         6),
  ('adenta',            'greater accra', 'Adenta',           7),
  ('ashaiman',          'greater accra', 'Ashaiman',         8),
  ('ayawaso-central',   'greater accra', 'Ayawaso Central',  9),
  ('ayawaso-east',      'greater accra', 'Ayawaso East',     10),
  ('ayawaso-north',     'greater accra', 'Ayawaso North',    11),
  ('ayawaso-west',      'greater accra', 'Ayawaso West',     12),
  ('ga-central',        'greater accra', 'Ga Central',       13),
  ('ga-east',           'greater accra', 'Ga East',          14),
  ('ga-north',          'greater accra', 'Ga North',         15),
  ('ga-south',          'greater accra', 'Ga South',         16),
  ('ga-west',           'greater accra', 'Ga West',          17),
  ('korle-klottey',     'greater accra', 'Korle-Klottey',    18),
  ('kpone-katamanso',   'greater accra', 'Kpone-Katamanso',  19),
  ('krowor',            'greater accra', 'Krowor',           20),
  ('la-dade-kotopon',   'greater accra', 'La-Dade-Kotopon',  21),
  ('la-nkwantanang-madina', 'greater accra', 'La-Nkwantanang-Madina', 22),
  ('ledzokuku',         'greater accra', 'Ledzokuku',        23),
  ('ningo-prampram',    'greater accra', 'Ningo-Prampram',   24),
  ('okaikwei-north',    'greater accra', 'Okaikwei North',   25),
  ('shai-osudoku',      'greater accra', 'Shai-Osudoku',     26),
  ('tema',              'greater accra', 'Tema',             27),
  ('tema-west',         'greater accra', 'Tema West',        28),
  ('weija-gbawe',       'greater accra', 'Weija-Gbawe',      29)
ON CONFLICT (id) DO NOTHING;

-- Ashanti (43)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('adansi-asokwa',          'ashanti', 'Adansi Asokwa',          1),
  ('adansi-north',           'ashanti', 'Adansi North',           2),
  ('adansi-south',           'ashanti', 'Adansi South',           3),
  ('afigya-kwabre-north',    'ashanti', 'Afigya-Kwabre North',    4),
  ('afigya-kwabre-south',    'ashanti', 'Afigya-Kwabre South',    5),
  ('ahafo-ano-north',        'ashanti', 'Ahafo Ano North',        6),
  ('ahafo-ano-south-east',   'ashanti', 'Ahafo Ano South East',   7),
  ('ahafo-ano-south-west',   'ashanti', 'Ahafo Ano South West',   8),
  ('akrofuom',               'ashanti', 'Akrofuom',               9),
  ('amansie-central',        'ashanti', 'Amansie Central',        10),
  ('amansie-south',          'ashanti', 'Amansie South',          11),
  ('amansie-west',           'ashanti', 'Amansie West',           12),
  ('asante-akim-central',    'ashanti', 'Asante Akim Central',    13),
  ('asante-akim-north',      'ashanti', 'Asante Akim North',      14),
  ('asante-akim-south',      'ashanti', 'Asante Akim South',      15),
  ('asokore-mampong',        'ashanti', 'Asokore Mampong',        16),
  ('asokwa',                 'ashanti', 'Asokwa',                 17),
  ('atwima-kwanwoma',        'ashanti', 'Atwima Kwanwoma',        18),
  ('atwima-mponua',          'ashanti', 'Atwima Mponua',          19),
  ('atwima-nwabiagya',       'ashanti', 'Atwima Nwabiagya',       20),
  ('atwima-nwabiagya-north', 'ashanti', 'Atwima Nwabiagya North', 21),
  ('bekwai',                 'ashanti', 'Bekwai',                 22),
  ('bosome-freho',           'ashanti', 'Bosome Freho',           23),
  ('bosomtwe',               'ashanti', 'Bosomtwe',               24),
  ('ejura-sekyedumase',      'ashanti', 'Ejura Sekyedumase',      25),
  ('ejisu',                  'ashanti', 'Ejisu',                  26),
  ('juaben',                 'ashanti', 'Juaben',                 27),
  ('kumasi',                 'ashanti', 'Kumasi',                 28),
  ('kwabre-east',            'ashanti', 'Kwabre East',            29),
  ('mampong',                'ashanti', 'Mampong',                30),
  ('obuasi-east',            'ashanti', 'Obuasi East',            31),
  ('obuasi',                 'ashanti', 'Obuasi',                 32),
  ('offinso-north',          'ashanti', 'Offinso North',          33),
  ('offinso',                'ashanti', 'Offinso',                34),
  ('oforikrom',              'ashanti', 'Oforikrom',              35),
  ('old-tafo',               'ashanti', 'Old Tafo',               36),
  ('sekyere-afram-plains',   'ashanti', 'Sekyere Afram Plains',   37),
  ('sekyere-central',        'ashanti', 'Sekyere Central',        38),
  ('sekyere-east',           'ashanti', 'Sekyere East',           39),
  ('sekyere-kumawu',         'ashanti', 'Sekyere Kumawu',         40),
  ('sekyere-south',          'ashanti', 'Sekyere South',          41)
ON CONFLICT (id) DO NOTHING;

-- Central (22)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('abura-asebu-kwamankese', 'central', 'Abura-Asebu-Kwamankese',   1),
  ('agona-east',             'central', 'Agona East',               2),
  ('agona-west',             'central', 'Agona West',               3),
  ('ajumako-enyan-essiam',   'central', 'Ajumako-Enyan-Essiam',     4),
  ('asikuma-odoben-brakwa',  'central', 'Asikuma-Odoben-Brakwa',    5),
  ('assin-north',            'central', 'Assin North',              6),
  ('assin-south',            'central', 'Assin South',              7),
  ('awutu-senya-east',       'central', 'Awutu-Senya East',         8),
  ('awutu-senya-west',       'central', 'Awutu-Senya West',         9),
  ('cape-coast',             'central', 'Cape Coast',               10),
  ('effutu',                 'central', 'Effutu',                   11),
  ('ekumfi',                 'central', 'Ekumfi',                   12),
  ('gomoa-central',          'central', 'Gomoa Central',            13),
  ('gomoa-east',             'central', 'Gomoa East',               14),
  ('gomoa-west',             'central', 'Gomoa West',               15),
  ('komenda-edina-eguafo-abirem', 'central', 'Komenda-Edina-Eguafo-Abirem', 16),
  ('mfantsiman',             'central', 'Mfantsiman',               17),
  ('twifo-atti-morkwa',      'central', 'Twifo-Atti-Morkwa',        18),
  ('twifo-hemang-lower-denkyira', 'central', 'Twifo-Hemang-Lower Denkyira', 19),
  ('upper-denkyira-east',    'central', 'Upper Denkyira East',      20),
  ('upper-denkyira-west',    'central', 'Upper Denkyira West',      21)
ON CONFLICT (id) DO NOTHING;

-- Eastern (33)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('abuakwa-north',                'eastern', 'Abuakwa North',               1),
  ('abuakwa-south',                'eastern', 'Abuakwa South',               2),
  ('akuapim-north',                'eastern', 'Akuapim North',               3),
  ('akuapim-south',                'eastern', 'Akuapim South',               4),
  ('akyemansa',                    'eastern', 'Akyemansa',                   5),
  ('asene-manso-akroso',           'eastern', 'Asene Manso Akroso',          6),
  ('asuogyaman',                   'eastern', 'Asuogyaman',                  7),
  ('atiwa-east',                   'eastern', 'Atiwa East',                  8),
  ('atiwa-west',                   'eastern', 'Atiwa West',                  9),
  ('ayensuano',                    'eastern', 'Ayensuano',                   10),
  ('birim-central',                'eastern', 'Birim Central',               11),
  ('birim-north',                  'eastern', 'Birim North',                 12),
  ('birim-south',                  'eastern', 'Birim South',                 13),
  ('denkyembour',                  'eastern', 'Denkyembour',                 14),
  ('fanteakwa-north',              'eastern', 'Fanteakwa North',             15),
  ('fanteakwa-south',              'eastern', 'Fanteakwa South',             16),
  ('kwaebibirem',                  'eastern', 'Kwaebibirem',                 17),
  ('kwahu-afram-plains-north',     'eastern', 'Kwahu Afram Plains North',    18),
  ('kwahu-afram-plains-south',     'eastern', 'Kwahu Afram Plains South',    19),
  ('kwahu-east',                   'eastern', 'Kwahu East',                  20),
  ('kwahu-south',                  'eastern', 'Kwahu South',                 21),
  ('kwahu-west',                   'eastern', 'Kwahu West',                  22),
  ('lower-manya-krobo',            'eastern', 'Lower Manya Krobo',           23),
  ('new-juaben-north',             'eastern', 'New Juaben North',            24),
  ('new-juaben-south',             'eastern', 'New Juaben South',            25),
  ('nsawam-adoagyiri',             'eastern', 'Nsawam Adoagyiri',            26),
  ('okere',                        'eastern', 'Okere',                       27),
  ('suhum',                        'eastern', 'Suhum',                       28),
  ('upper-manya-krobo',            'eastern', 'Upper Manya Krobo',           29),
  ('upper-west-akim',              'eastern', 'Upper West Akim',             30),
  ('west-akim',                    'eastern', 'West Akim',                   31),
  ('yilo-krobo',                   'eastern', 'Yilo Krobo',                  32)
ON CONFLICT (id) DO NOTHING;

-- Western (14)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('ahanta-west',              'western', 'Ahanta West',             1),
  ('effia-kwesimintsim',       'western', 'Effia-Kwesimintsim',      2),
  ('ellembelle',               'western', 'Ellembelle',              3),
  ('evalue-gwira',             'western', 'Evalue Gwira',            4),
  ('jomoro',                   'western', 'Jomoro',                  5),
  ('mpohor',                   'western', 'Mpohor',                  6),
  ('nzema-east',               'western', 'Nzema East',              7),
  ('prestea-huni-valley',      'western', 'Prestea-Huni Valley',     8),
  ('sekondi-takoradi',         'western', 'Sekondi-Takoradi',        9),
  ('shama',                    'western', 'Shama',                   10),
  ('tarkwa-nsuaem',            'western', 'Tarkwa-Nsuaem',           11),
  ('wassa-amenfi-central',     'western', 'Wassa Amenfi Central',    12),
  ('wassa-amenfi-east',        'western', 'Wassa Amenfi East',       13),
  ('wassa-amenfi-west',        'western', 'Wassa Amenfi West',       14)
ON CONFLICT (id) DO NOTHING;

-- Western North (9)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('aowin',                        'western north', 'Aowin',                        1),
  ('bia-east',                     'western north', 'Bia East',                     2),
  ('bia-west',                     'western north', 'Bia West',                     3),
  ('bibiani-anhwiaso-bekwai',      'western north', 'Bibiani-Anhwiaso-Bekwai',      4),
  ('bodi',                         'western north', 'Bodi',                         5),
  ('juaboso',                      'western north', 'Juaboso',                      6),
  ('sefwi-akontombra',             'western north', 'Sefwi-Akontombra',             7),
  ('sefwi-wiawso',                 'western north', 'Sefwi-Wiawso',                 8),
  ('suaman',                       'western north', 'Suaman',                       9)
ON CONFLICT (id) DO NOTHING;

-- Northern (16)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('gushegu',            'northern', 'Gushegu',            1),
  ('karaga',             'northern', 'Karaga',             2),
  ('kpandai',            'northern', 'Kpandai',            3),
  ('kumbungu',           'northern', 'Kumbungu',           4),
  ('mion',               'northern', 'Mion',               5),
  ('nanton',             'northern', 'Nanton',             6),
  ('nanumba-north',      'northern', 'Nanumba North',      7),
  ('nanumba-south',      'northern', 'Nanumba South',      8),
  ('saboba',             'northern', 'Saboba',             9),
  ('sagnarigu',          'northern', 'Sagnarigu',          10),
  ('savelugu',           'northern', 'Savelugu',           11),
  ('tamale',             'northern', 'Tamale',             12),
  ('tatale',             'northern', 'Tatale',             13),
  ('tolon',              'northern', 'Tolon',              14),
  ('yendi',              'northern', 'Yendi',              15),
  ('zabzugu',            'northern', 'Zabzugu',            16)
ON CONFLICT (id) DO NOTHING;

-- Savannah (7)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('bole',                   'savannah', 'Bole',                   1),
  ('central-gonja',          'savannah', 'Central Gonja',          2),
  ('east-gonja',             'savannah', 'East Gonja',             3),
  ('north-east-gonja',       'savannah', 'North East Gonja',       4),
  ('north-gonja',            'savannah', 'North Gonja',            5),
  ('sawla-tuna-kalba',       'savannah', 'Sawla-Tuna-Kalba',       6),
  ('west-gonja',             'savannah', 'West Gonja',             7)
ON CONFLICT (id) DO NOTHING;

-- North East (6)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('bunkpurugu-nyankpanduri', 'north east', 'Bunkpurugu-Nyankpanduri', 1),
  ('chereponi',               'north east', 'Chereponi',               2),
  ('east-mamprusi',           'north east', 'East Mamprusi',           3),
  ('mamprugu-moagduri',       'north east', 'Mamprugu Moagduri',       4),
  ('west-mamprusi',           'north east', 'West Mamprusi',           5),
  ('yunyoo-nasuan',           'north east', 'Yunyoo-Nasuan',           6)
ON CONFLICT (id) DO NOTHING;

-- Upper East (15)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('bawku',                   'upper east', 'Bawku',                   1),
  ('bawku-west',              'upper east', 'Bawku West',              2),
  ('binduri',                 'upper east', 'Binduri',                 3),
  ('bolgatanga',              'upper east', 'Bolgatanga',              4),
  ('bolgatanga-east',         'upper east', 'Bolgatanga East',         5),
  ('bongo',                   'upper east', 'Bongo',                   6),
  ('builsa-north',            'upper east', 'Builsa North',            7),
  ('builsa-south',            'upper east', 'Builsa South',            8),
  ('garu',                    'upper east', 'Garu',                    9),
  ('kassena-nankana',         'upper east', 'Kassena-Nankana',         10),
  ('kassena-nankana-west',    'upper east', 'Kassena-Nankana West',    11),
  ('nabdam',                  'upper east', 'Nabdam',                  12),
  ('pusiga',                  'upper east', 'Pusiga',                  13),
  ('talensi',                 'upper east', 'Talensi',                 14),
  ('tempane',                 'upper east', 'Tempane',                 15)
ON CONFLICT (id) DO NOTHING;

-- Upper West (11)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('daffiama-bussie-issa', 'upper west', 'Daffiama-Bussie-Issa', 1),
  ('jirapa',               'upper west', 'Jirapa',               2),
  ('lambussie',            'upper west', 'Lambussie',            3),
  ('lawra',                'upper west', 'Lawra',                4),
  ('nadowli-kaleo',        'upper west', 'Nadowli-Kaleo',        5),
  ('nandom',               'upper west', 'Nandom',               6),
  ('sissala-east',         'upper west', 'Sissala East',         7),
  ('sissala-west',         'upper west', 'Sissala West',         8),
  ('wa-east',              'upper west', 'Wa East',              9),
  ('wa-municipal',         'upper west', 'Wa Municipal',         10),
  ('wa-west',              'upper west', 'Wa West',              11)
ON CONFLICT (id) DO NOTHING;

-- Volta (18)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('adaklu',            'volta', 'Adaklu',            1),
  ('afadzato-south',    'volta', 'Afadzato South',    2),
  ('agotime-ziope',     'volta', 'Agotime-Ziope',     3),
  ('akatsi-north',      'volta', 'Akatsi North',      4),
  ('akatsi-south',      'volta', 'Akatsi South',      5),
  ('anloga',            'volta', 'Anloga',            6),
  ('central-tongu',     'volta', 'Central Tongu',     7),
  ('ho-municipal',      'volta', 'Ho Municipal',      8),
  ('ho-west',           'volta', 'Ho West',           9),
  ('hohoe',             'volta', 'Hohoe',             10),
  ('keta-municipal',    'volta', 'Keta Municipal',    11),
  ('ketu-north',        'volta', 'Ketu North',        12),
  ('ketu-south',        'volta', 'Ketu South',        13),
  ('kpando',            'volta', 'Kpando',            14),
  ('north-dayi',        'volta', 'North Dayi',        15),
  ('north-tongu',       'volta', 'North Tongu',       16),
  ('south-dayi',        'volta', 'South Dayi',        17),
  ('south-tongu',       'volta', 'South Tongu',       18)
ON CONFLICT (id) DO NOTHING;

-- Oti (8)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('biakoye',          'oti', 'Biakoye',         1),
  ('jasikan',          'oti', 'Jasikan',         2),
  ('kadjebi',          'oti', 'Kadjebi',         3),
  ('krachi-east',      'oti', 'Krachi East',     4),
  ('krachi-nchumuru',  'oti', 'Krachi Nchumuru', 5),
  ('krachi-west',      'oti', 'Krachi West',     6),
  ('nkwanta-north',    'oti', 'Nkwanta North',   7),
  ('nkwanta-south',    'oti', 'Nkwanta South',   8)
ON CONFLICT (id) DO NOTHING;

-- Bono (12)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('banda',            'bono', 'Banda',            1),
  ('berekum-east',     'bono', 'Berekum East',     2),
  ('berekum-west',     'bono', 'Berekum West',     3),
  ('dormaa-central',   'bono', 'Dormaa Central',   4),
  ('dormaa-east',      'bono', 'Dormaa East',      5),
  ('dormaa-west',      'bono', 'Dormaa West',      6),
  ('jaman-north',      'bono', 'Jaman North',      7),
  ('jaman-south',      'bono', 'Jaman South',      8),
  ('sunyani',          'bono', 'Sunyani',          9),
  ('sunyani-west',     'bono', 'Sunyani West',     10),
  ('tain',             'bono', 'Tain',             11),
  ('wenchi',           'bono', 'Wenchi',           12)
ON CONFLICT (id) DO NOTHING;

-- Bono East (11)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('atebubu-amantin',   'bono east', 'Atebubu-Amantin',   1),
  ('kintampo-north',    'bono east', 'Kintampo North',    2),
  ('kintampo-south',    'bono east', 'Kintampo South',    3),
  ('nkoranza-north',    'bono east', 'Nkoranza North',    4),
  ('nkoranza-south',    'bono east', 'Nkoranza South',    5),
  ('pru-east',          'bono east', 'Pru East',          6),
  ('pru-west',          'bono east', 'Pru West',          7),
  ('sene-east',         'bono east', 'Sene East',         8),
  ('sene-west',         'bono east', 'Sene West',         9),
  ('techiman',          'bono east', 'Techiman',          10),
  ('techiman-north',    'bono east', 'Techiman North',    11)
ON CONFLICT (id) DO NOTHING;

-- Ahafo (6)
INSERT INTO districts (id, region_id, name, display_order)
VALUES
  ('asunafo-north',   'ahafo', 'Asunafo North',   1),
  ('asunafo-south',   'ahafo', 'Asunafo South',   2),
  ('asutifi-north',   'ahafo', 'Asutifi North',   3),
  ('asutifi-south',   'ahafo', 'Asutifi South',   4),
  ('tano-north',      'ahafo', 'Tano North',      5),
  ('tano-south',      'ahafo', 'Tano South',      6)
ON CONFLICT (id) DO NOTHING;