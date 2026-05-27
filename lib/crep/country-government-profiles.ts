import type { JurisdictionEntry, ViewportPlaceLike } from "@/lib/crep/viewport-place"

export type CountryGovernmentOfficial = {
  id: string
  name: string
  office: string
  party?: string
  jurisdiction_name: string
  urls?: string[]
  phones?: string[]
  emails?: string[]
  address?: string
  image_url?: string | null
  term_start?: string
  term_end?: string | null
}

export type CountryGovernmentRecord = {
  id: string
  title: string
  subtitle?: string
  url?: string
}

export type CountryGovernmentTab = {
  id: string
  label: string
  shortLabel: string
  description?: string
  items: CountryGovernmentRecord[]
}

export type CountryGovernmentPoliticsItem = {
  id: string
  kind: "election" | "legislation" | "office" | "institution"
  title: string
  subtitle?: string
  url?: string
}

export type CountryGovernmentProfile = {
  key: string
  name: string
  countryCode?: string
  aliases: string[]
  flagUrl?: string
  sealUrls: string[]
  governmentType: string
  politicalSystem?: string
  leadership: CountryGovernmentOfficial[]
  politics: CountryGovernmentPoliticsItem[]
  governmentTabs: CountryGovernmentTab[]
}

const FLAG_BASE = "https://flagcdn.com/w80"

const LEADER_IMAGE_URLS: Record<string, string> = {
  "Donald J. Trump": "https://commons.wikimedia.org/wiki/Special:FilePath/Official_Presidential_Portrait_of_President_Donald_J._Trump_(2025)_(cropped)(2).jpg?width=256",
  "JD Vance": "https://commons.wikimedia.org/wiki/Special:FilePath/March_2026_Official_Vice_Presidential_Portrait_of_JD_Vance.jpg?width=256",
  "Mark Carney": "https://commons.wikimedia.org/wiki/Special:FilePath/2025-11-14_InaugurationREM_Deux-Montagnes_Mark_Carney.jpg?width=256",
  "Mary Simon": "https://commons.wikimedia.org/wiki/Special:FilePath/Mary_Simon%2C_Governor_General_of_Canada.jpg?width=256",
  "Charles III": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/King_Charles_III_%28July_2023%29.jpg/330px-King_Charles_III_%28July_2023%29.jpg",
  "Claudia Sheinbaum Pardo": "https://commons.wikimedia.org/wiki/Special:FilePath/Claudia_Sheinbaum_en_su_conferencia_matutina_(cropped).jpg?width=256",
  "Emmanuel Macron": "https://commons.wikimedia.org/wiki/Special:FilePath/Emmanuel_Macron_2025_(cropped).jpg?width=256",
  "Sebastian Lecornu": "https://commons.wikimedia.org/wiki/Special:FilePath/S%C3%A9bastien_Lecornu_2024_(2x3_crop).jpg?width=256",
  "Frank-Walter Steinmeier": "https://commons.wikimedia.org/wiki/Special:FilePath/Frank-Walter_Steinmeier_in_2025_(cropped).jpg?width=256",
  "Friedrich Merz": "https://commons.wikimedia.org/wiki/Special:FilePath/2024-08-21_Friedrich_Merz_in_Erfurt_2024_STP_3041_by_Stepro_(3x4_cropped).jpg?width=256",
  "Sergio Mattarella": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Sergio_Mattarella_Presidente_della_Repubblica_Italiana.jpg/330px-Sergio_Mattarella_Presidente_della_Repubblica_Italiana.jpg",
  "Giorgia Meloni": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Giorgia_Meloni_Official_2024_%28cropped%29.jpg/330px-Giorgia_Meloni_Official_2024_%28cropped%29.jpg",
  "Felipe VI": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Daiga_Mieri%C5%86a_tiekas_ar_Sp%C4%81nijas_karali_-_53814974005_%28cropped%29-2.jpg/330px-Daiga_Mieri%C5%86a_tiekas_ar_Sp%C4%81nijas_karali_-_53814974005_%28cropped%29-2.jpg",
  "Pedro Sanchez": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Pedro_S%C3%A1nchez_in_2026.jpg/330px-Pedro_S%C3%A1nchez_in_2026.jpg",
  "Philippe": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/King_Philippe_of_Belgium_%28January_2025%29.jpg/330px-King_Philippe_of_Belgium_%28January_2025%29.jpg",
  "Bart De Wever": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bart_De_Wever%2C_2025.06.26_%2802%29.jpg/330px-Bart_De_Wever%2C_2025.06.26_%2802%29.jpg",
  "Willem-Alexander": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/King_Willem-Alexander_2025.jpg/330px-King_Willem-Alexander_2025.jpg",
  "Rob Jetten": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Rob_Jetten%2C_March_2026_-_02.jpg/330px-Rob_Jetten%2C_March_2026_-_02.jpg",
  "Xi Jinping": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Xi_Jinping_meets_Keir_Starmer_Jan_2026_%28cropped_2%29.jpg/330px-Xi_Jinping_meets_Keir_Starmer_Jan_2026_%28cropped_2%29.jpg",
  "Li Qiang": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Li_Qiang_meets_Keir_Starmer_Jan_2026.jpg/330px-Li_Qiang_meets_Keir_Starmer_Jan_2026.jpg",
  "TAKAICHI Sanae": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Official_portrait_of_Sanae_Takaichi%2C_Prime_Minister_of_Japan_%28HD%29.jpg/330px-Official_portrait_of_Sanae_Takaichi%2C_Prime_Minister_of_Japan_%28HD%29.jpg",
  "Naruhito": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Emperor_Naruhito_20250611_%2854582524056%2C_cropped%29.jpg/330px-Emperor_Naruhito_20250611_%2854582524056%2C_cropped%29.jpg",
  "Droupadi Murmu": "https://commons.wikimedia.org/wiki/Special:FilePath/President_Droupadi_Murmu_official_portrait.jpg?width=256",
  "Narendra Modi": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/The_official_portrait_of_Shri_Narendra_Modi%2C_the_Prime_Minister_of_the_Republic_of_India.jpg/330px-The_official_portrait_of_Shri_Narendra_Modi%2C_the_Prime_Minister_of_the_Republic_of_India.jpg",
  "Anthony Albanese": "https://commons.wikimedia.org/wiki/Special:FilePath/Anthony_Albanese_portrait_2022.jpg?width=256",
  "Sam Mostyn": "https://commons.wikimedia.org/wiki/Special:FilePath/Sam_Mostyn_2024.jpg?width=256",
  "Luiz Inacio Lula da Silva": "https://commons.wikimedia.org/wiki/Special:FilePath/Lula_2023_official_portrait.jpg?width=256",
  "Geraldo Alckmin": "https://commons.wikimedia.org/wiki/Special:FilePath/Geraldo_Alckmin_oficial_2023.jpg?width=256",
  "Cyril Ramaphosa": "https://commons.wikimedia.org/wiki/Special:FilePath/Cyril_Ramaphosa_2022.jpg?width=256",
  "Paul Mashatile": "https://commons.wikimedia.org/wiki/Special:FilePath/Paul_Mashatile_2024.jpg?width=256",
  "Bola Tinubu": "https://commons.wikimedia.org/wiki/Special:FilePath/Bola_Tinubu_portrait.jpg?width=256",
  "Kashim Shettima": "https://commons.wikimedia.org/wiki/Special:FilePath/Kashim_Shettima_2023.jpg?width=256",
  "Abdel Fattah el-Sisi": "https://commons.wikimedia.org/wiki/Special:FilePath/Abdel_Fattah_el-Sisi_2017.jpg?width=256",
  "Mostafa Madbouly": "https://commons.wikimedia.org/wiki/Special:FilePath/Mostafa_Madbouly_2024.jpg?width=256",
  "Recep Tayyip Erdogan": "https://commons.wikimedia.org/wiki/Special:FilePath/Recep_Tayyip_Erdogan_2024.jpg?width=256",
  "Cevdet Yilmaz": "https://commons.wikimedia.org/wiki/Special:FilePath/Cevdet_Yilmaz_2023.jpg?width=256",
  "Lee Jae Myung": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/President_Lee_Jae_Myung_20260306.jpg/330px-President_Lee_Jae_Myung_20260306.jpg",
  "Kim Min-seok": "https://commons.wikimedia.org/wiki/Special:FilePath/Kim_Min-seok_2025.jpg?width=256",
  "Antonio Costa": "https://commons.wikimedia.org/wiki/Special:FilePath/Ant%C3%B3nio_Costa_2024.jpg?width=256",
  "Ursula von der Leyen": "https://commons.wikimedia.org/wiki/Special:FilePath/Ursula_von_der_Leyen_2024.jpg?width=256",
  "Roberta Metsola": "https://commons.wikimedia.org/wiki/Special:FilePath/Roberta_Metsola_2024.jpg?width=256",
  "Keir Starmer": "https://commons.wikimedia.org/wiki/Special:FilePath/Keir_Starmer_official_portrait_2024.jpg?width=256",
}

export function countryGovernmentOfficialWithDefaults(
  official: CountryGovernmentOfficial,
): CountryGovernmentOfficial {
  return {
    ...official,
    urls: Array.isArray(official.urls) ? official.urls : [],
    phones: Array.isArray(official.phones) ? official.phones : [],
    emails: Array.isArray(official.emails) ? official.emails : [],
    image_url: official.image_url ?? LEADER_IMAGE_URLS[official.name] ?? null,
  }
}

export const COUNTRY_GOVERNMENT_PROFILES: CountryGovernmentProfile[] = [
  {
    key: "US",
    name: "United States",
    countryCode: "US",
    aliases: ["us", "usa", "united states", "united states of america"],
    flagUrl: `${FLAG_BASE}/us.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Great_Seal_of_the_United_States_%28obverse%29.svg/256px-Great_Seal_of_the_United_States_%28obverse%29.svg.png",
    ],
    governmentType: "Federal presidential constitutional republic",
    politicalSystem: "Federal system with executive, legislative, and judicial branches",
    leadership: [
      {
        id: "us:president:trump",
        name: "Donald J. Trump",
        office: "President of the United States",
        party: "Republican",
        jurisdiction_name: "United States",
        urls: ["https://www.whitehouse.gov/"],
        term_start: "2025-01-20",
        term_end: null,
      },
      {
        id: "us:vice-president:vance",
        name: "JD Vance",
        office: "Vice President of the United States",
        party: "Republican",
        jurisdiction_name: "United States",
        urls: ["https://www.whitehouse.gov/administration/vice-president-vance/"],
        term_start: "2025-01-20",
        term_end: null,
      },
    ],
    politics: [
      {
        id: "us:elections",
        kind: "election",
        title: "Federal elections",
        subtitle: "President, Congress, states, and local offices",
        url: "https://www.usa.gov/elections",
      },
      {
        id: "us:legislation",
        kind: "legislation",
        title: "Congress.gov legislation",
        subtitle: "Bills, resolutions, nominations, and treaties",
        url: "https://www.congress.gov/",
      },
    ],
    governmentTabs: [
      {
        id: "executive",
        label: "Executive",
        shortLabel: "Exec",
        items: [
          { id: "us:exec:white-house", title: "White House", subtitle: "President, Vice President, Executive Office", url: "https://www.whitehouse.gov/" },
          { id: "us:exec:cabinet", title: "Cabinet", subtitle: "Executive departments and cabinet-level agencies", url: "https://www.whitehouse.gov/administration/cabinet/" },
        ],
      },
      {
        id: "legislature",
        label: "Congress",
        shortLabel: "Congress",
        items: [
          { id: "us:leg:senate", title: "U.S. Senate", subtitle: "100 senators, two per state", url: "https://www.senate.gov/" },
          { id: "us:leg:house", title: "U.S. House of Representatives", subtitle: "435 voting representatives", url: "https://www.house.gov/" },
        ],
      },
      {
        id: "administration",
        label: "Departments",
        shortLabel: "Depts",
        items: [
          { id: "us:admin:agencies", title: "Federal agencies", subtitle: "Departments, independent agencies, boards, and commissions", url: "https://www.usa.gov/agency-index" },
        ],
      },
      {
        id: "judiciary",
        label: "Judiciary",
        shortLabel: "Courts",
        items: [
          { id: "us:courts", title: "Federal judiciary", subtitle: "Supreme Court and federal court system", url: "https://www.uscourts.gov/" },
        ],
      },
    ],
  },
  {
    key: "CA",
    name: "Canada",
    countryCode: "CA",
    aliases: ["ca", "canada"],
    flagUrl: `${FLAG_BASE}/ca.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Coat_of_arms_of_Canada.svg/256px-Coat_of_arms_of_Canada.svg.png",
    ],
    governmentType: "Federal parliamentary constitutional monarchy",
    politicalSystem: "Crown, Governor General, Prime Minister, Cabinet, and Parliament",
    leadership: [
      {
        id: "ca:pm:carney",
        name: "Mark Carney",
        office: "Prime Minister of Canada",
        jurisdiction_name: "Canada",
        urls: ["https://www.pm.gc.ca/"],
        term_start: "2025-03-14",
        term_end: null,
      },
      {
        id: "ca:governor-general:simon",
        name: "Mary Simon",
        office: "Governor General of Canada",
        jurisdiction_name: "Canada",
        urls: ["https://www.gg.ca/"],
        term_start: "2021-07-26",
        term_end: null,
      },
      {
        id: "ca:monarch:charles",
        name: "Charles III",
        office: "King of Canada",
        jurisdiction_name: "Canada",
        urls: ["https://www.canada.ca/en/canadian-heritage/services/royal-family/king.html"],
        term_start: "2022-09-08",
        term_end: null,
      },
    ],
    politics: [
      { id: "ca:elections", kind: "election", title: "Federal elections and ridings", subtitle: "Elections Canada", url: "https://www.elections.ca/" },
      { id: "ca:parliament", kind: "legislation", title: "Parliament of Canada proceedings", subtitle: "Bills, votes, committees, and debates", url: "https://www.parl.ca/" },
    ],
    governmentTabs: [
      {
        id: "crown",
        label: "Crown",
        shortLabel: "Crown",
        items: [
          { id: "ca:crown:monarch", title: "King of Canada", subtitle: "Head of state represented federally by the Governor General", url: "https://www.canada.ca/en/canadian-heritage/services/royal-family/king.html" },
          { id: "ca:crown:gg", title: "Governor General", subtitle: "Federal representative of the Crown", url: "https://www.gg.ca/" },
        ],
      },
      {
        id: "executive",
        label: "Cabinet",
        shortLabel: "Cabinet",
        items: [
          { id: "ca:exec:pm", title: "Prime Minister and Cabinet", subtitle: "Head of government and federal ministers", url: "https://www.pm.gc.ca/" },
        ],
      },
      {
        id: "legislature",
        label: "Parliament",
        shortLabel: "Parl.",
        items: [
          { id: "ca:leg:commons", title: "House of Commons", subtitle: "Elected lower chamber", url: "https://www.ourcommons.ca/" },
          { id: "ca:leg:senate", title: "Senate of Canada", subtitle: "Appointed upper chamber", url: "https://sencanada.ca/" },
        ],
      },
      {
        id: "federalism",
        label: "Provinces",
        shortLabel: "Prov.",
        items: [
          { id: "ca:federalism", title: "Provinces and territories", subtitle: "Federal-provincial-territorial governance", url: "https://www.canada.ca/en/intergovernmental-affairs.html" },
        ],
      },
    ],
  },
  {
    key: "MX",
    name: "Mexico",
    countryCode: "MX",
    aliases: ["mx", "mexico", "mexico", "estados unidos mexicanos"],
    flagUrl: `${FLAG_BASE}/mx.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Coat_of_arms_of_Mexico.svg/256px-Coat_of_arms_of_Mexico.svg.png",
    ],
    governmentType: "Federal presidential constitutional republic",
    politicalSystem: "President, Congress of the Union, Supreme Court, states, and municipalities",
    leadership: [
      {
        id: "mx:president:sheinbaum",
        name: "Claudia Sheinbaum Pardo",
        office: "President of Mexico",
        jurisdiction_name: "Mexico",
        urls: ["https://www.gob.mx/presidencia/"],
        term_start: "2024-10-01",
        term_end: null,
      },
    ],
    politics: [
      { id: "mx:ine", kind: "election", title: "Federal and local electoral processes", subtitle: "Instituto Nacional Electoral", url: "https://www.ine.mx/" },
      { id: "mx:congreso", kind: "legislation", title: "Congress of the Union", subtitle: "Federal legislative information", url: "https://www.diputados.gob.mx/" },
    ],
    governmentTabs: [
      {
        id: "executive",
        label: "Presidency",
        shortLabel: "Exec",
        items: [
          { id: "mx:exec:presidency", title: "Presidency of Mexico", subtitle: "Head of state and head of government", url: "https://www.gob.mx/presidencia/" },
          { id: "mx:exec:secretariats", title: "Federal secretariats", subtitle: "Cabinet-level executive secretariats", url: "https://www.gob.mx/gobierno" },
        ],
      },
      {
        id: "legislature",
        label: "Congress",
        shortLabel: "Cong.",
        items: [
          { id: "mx:leg:deputies", title: "Chamber of Deputies", subtitle: "Lower chamber of Congress", url: "https://www.diputados.gob.mx/" },
          { id: "mx:leg:senate", title: "Senate of the Republic", subtitle: "Upper chamber of Congress", url: "https://www.senado.gob.mx/" },
        ],
      },
      {
        id: "judiciary",
        label: "Judiciary",
        shortLabel: "Courts",
        items: [
          { id: "mx:court:supreme", title: "Supreme Court of Justice", subtitle: "Federal judicial branch", url: "https://www.scjn.gob.mx/" },
        ],
      },
      {
        id: "federalism",
        label: "States",
        shortLabel: "States",
        items: [
          { id: "mx:federalism", title: "States and municipalities", subtitle: "Federal-state-municipal governance", url: "https://www.gob.mx/inafed" },
        ],
      },
    ],
  },
  {
    key: "CN",
    name: "China",
    countryCode: "CN",
    aliases: ["cn", "china", "people's republic of china", "peoples republic of china", "prc"],
    flagUrl: `${FLAG_BASE}/cn.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/National_Emblem_of_the_People%27s_Republic_of_China_%282%29.svg/256px-National_Emblem_of_the_People%27s_Republic_of_China_%282%29.svg.png",
    ],
    governmentType: "Unitary Marxist-Leninist one-party socialist republic",
    politicalSystem: "Chinese Communist Party, National People's Congress, State Council, and local people's governments",
    leadership: [
      {
        id: "cn:leader:xi",
        name: "Xi Jinping",
        office: "President of China; General Secretary of the Chinese Communist Party",
        jurisdiction_name: "People's Republic of China",
        urls: ["https://english.www.gov.cn/"],
        term_start: "2013-03-14",
        term_end: null,
      },
      {
        id: "cn:premier:li-qiang",
        name: "Li Qiang",
        office: "Premier of China",
        jurisdiction_name: "People's Republic of China",
        urls: ["https://english.www.gov.cn/"],
        term_start: "2023-03-11",
        term_end: null,
      },
    ],
    politics: [
      { id: "cn:npc", kind: "legislation", title: "National People's Congress", subtitle: "National legislature", url: "http://www.npc.gov.cn/englishnpc/index.shtml" },
      { id: "cn:state-council", kind: "institution", title: "State Council policy and legislation", subtitle: "Central People's Government", url: "https://english.www.gov.cn/policies/" },
    ],
    governmentTabs: [
      {
        id: "party",
        label: "CCP",
        shortLabel: "CCP",
        items: [
          { id: "cn:party:ccp", title: "Chinese Communist Party", subtitle: "Ruling party and central political authority", url: "https://english.www.gov.cn/" },
          { id: "cn:party:general-secretary", title: "General Secretary", subtitle: "Top CCP leadership office", url: "https://english.www.gov.cn/" },
        ],
      },
      {
        id: "state",
        label: "State",
        shortLabel: "State",
        items: [
          { id: "cn:state:president", title: "President of China", subtitle: "Head of state", url: "https://english.www.gov.cn/" },
          { id: "cn:state:council", title: "State Council", subtitle: "Premier and central government ministries", url: "https://english.www.gov.cn/statecouncil/" },
        ],
      },
      {
        id: "legislature",
        label: "NPC",
        shortLabel: "NPC",
        items: [
          { id: "cn:leg:npc", title: "National People's Congress", subtitle: "National legislature", url: "http://www.npc.gov.cn/englishnpc/index.shtml" },
        ],
      },
      {
        id: "advisory",
        label: "CPPCC",
        shortLabel: "CPPCC",
        items: [
          { id: "cn:cppcc", title: "Chinese People's Political Consultative Conference", subtitle: "Political advisory body", url: "http://en.cppcc.gov.cn/" },
        ],
      },
    ],
  },
  {
    key: "JP",
    name: "Japan",
    countryCode: "JP",
    aliases: ["jp", "japan"],
    flagUrl: `${FLAG_BASE}/jp.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Imperial_Seal_of_Japan.svg/256px-Imperial_Seal_of_Japan.svg.png",
    ],
    governmentType: "Unitary parliamentary constitutional monarchy",
    politicalSystem: "Emperor, Prime Minister, Cabinet, National Diet, and courts",
    leadership: [
      {
        id: "jp:pm:takaichi",
        name: "TAKAICHI Sanae",
        office: "Prime Minister of Japan",
        jurisdiction_name: "Japan",
        urls: ["https://japan.kantei.go.jp/"],
        term_start: "2026-02-18",
        term_end: null,
      },
      {
        id: "jp:emperor:naruhito",
        name: "Naruhito",
        office: "Emperor of Japan",
        jurisdiction_name: "Japan",
        urls: ["https://www.kunaicho.go.jp/eindex.html"],
        term_start: "2019-05-01",
        term_end: null,
      },
    ],
    politics: [
      { id: "jp:elections", kind: "election", title: "National elections", subtitle: "Ministry of Internal Affairs and Communications", url: "https://www.soumu.go.jp/english/" },
      { id: "jp:diet", kind: "legislation", title: "National Diet legislation", subtitle: "Bills and proceedings", url: "https://www.sangiin.go.jp/eng/" },
    ],
    governmentTabs: [
      {
        id: "imperial",
        label: "Imperial",
        shortLabel: "Imperial",
        items: [
          { id: "jp:imperial:emperor", title: "Emperor of Japan", subtitle: "Symbol of the state under the Constitution", url: "https://www.kunaicho.go.jp/eindex.html" },
        ],
      },
      {
        id: "executive",
        label: "Cabinet",
        shortLabel: "Cabinet",
        items: [
          { id: "jp:exec:pm", title: "Prime Minister and Cabinet", subtitle: "Head of government and ministers of state", url: "https://japan.kantei.go.jp/" },
          { id: "jp:exec:ministries", title: "National ministries", subtitle: "Cabinet Office and ministries", url: "https://www.japan.go.jp/directory/" },
        ],
      },
      {
        id: "legislature",
        label: "National Diet",
        shortLabel: "Diet",
        items: [
          { id: "jp:leg:representatives", title: "House of Representatives", subtitle: "Lower house of the National Diet", url: "https://www.shugiin.go.jp/internet/index.nsf/html/index_e.htm" },
          { id: "jp:leg:councillors", title: "House of Councillors", subtitle: "Upper house of the National Diet", url: "https://www.sangiin.go.jp/eng/" },
        ],
      },
      {
        id: "judiciary",
        label: "Judiciary",
        shortLabel: "Courts",
        items: [
          { id: "jp:court:supreme", title: "Supreme Court of Japan", subtitle: "Highest court", url: "https://www.courts.go.jp/english/index.html" },
        ],
      },
    ],
  },
  {
    key: "EU",
    name: "European Union",
    countryCode: "EU",
    aliases: ["eu", "european union", "europe", "european union and united kingdom"],
    flagUrl: `${FLAG_BASE}/eu.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Flag_of_Europe.svg/256px-Flag_of_Europe.svg.png",
    ],
    governmentType: "Supranational political and economic union",
    politicalSystem: "European Council, European Commission, European Parliament, and Council of the European Union",
    leadership: [
      {
        id: "eu:council:costa",
        name: "Antonio Costa",
        office: "President of the European Council",
        jurisdiction_name: "European Union",
        urls: ["https://www.consilium.europa.eu/european-council/president/role/"],
        term_start: "2024-12-01",
        term_end: null,
      },
      {
        id: "eu:commission:von-der-leyen",
        name: "Ursula von der Leyen",
        office: "President of the European Commission",
        jurisdiction_name: "European Union",
        urls: ["https://commission.europa.eu/"],
        term_start: "2024-12-01",
        term_end: null,
      },
      {
        id: "eu:parliament:metsola",
        name: "Roberta Metsola",
        office: "President of the European Parliament",
        jurisdiction_name: "European Union",
        urls: ["https://www.europarl.europa.eu/the-president/en/"],
        term_start: "2022-01-18",
        term_end: null,
      },
    ],
    politics: [
      { id: "eu:elections", kind: "election", title: "European Parliament elections", subtitle: "EU-wide parliamentary elections", url: "https://elections.europa.eu/" },
      { id: "eu:law", kind: "legislation", title: "European Union law", subtitle: "EUR-Lex law, treaties, and acts", url: "https://eur-lex.europa.eu/" },
    ],
    governmentTabs: [
      {
        id: "council",
        label: "Council",
        shortLabel: "Council",
        items: [
          { id: "eu:institution:european-council", title: "European Council", subtitle: "Heads of state or government define political direction", url: "https://www.consilium.europa.eu/en/european-council/" },
          { id: "eu:institution:council-eu", title: "Council of the European Union", subtitle: "Member state ministers adopt laws and coordinate policies", url: "https://www.consilium.europa.eu/en/council-eu/" },
        ],
      },
      {
        id: "commission",
        label: "Commission",
        shortLabel: "Comm.",
        items: [
          { id: "eu:institution:commission", title: "European Commission", subtitle: "Executive institution proposing and enforcing EU law", url: "https://commission.europa.eu/" },
        ],
      },
      {
        id: "parliament",
        label: "Parliament",
        shortLabel: "Parl.",
        items: [
          { id: "eu:institution:parliament", title: "European Parliament", subtitle: "Directly elected EU legislative body", url: "https://www.europarl.europa.eu/" },
        ],
      },
      {
        id: "court",
        label: "Court",
        shortLabel: "Court",
        items: [
          { id: "eu:institution:cjeu", title: "Court of Justice of the European Union", subtitle: "Ensures EU law is interpreted and applied consistently", url: "https://curia.europa.eu/" },
        ],
      },
    ],
  },
  {
    key: "GB",
    name: "United Kingdom",
    countryCode: "GB",
    aliases: ["gb", "uk", "united kingdom", "great britain", "britain", "european union and united kingdom"],
    flagUrl: `${FLAG_BASE}/gb.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Royal_Coat_of_Arms_of_the_United_Kingdom_%28HM_Government%29.svg/256px-Royal_Coat_of_Arms_of_the_United_Kingdom_%28HM_Government%29.svg.png",
    ],
    governmentType: "Unitary parliamentary constitutional monarchy",
    politicalSystem: "Monarch, Prime Minister, Cabinet, Parliament, devolved governments, and courts",
    leadership: [
      {
        id: "gb:pm:starmer",
        name: "Keir Starmer",
        office: "Prime Minister of the United Kingdom",
        jurisdiction_name: "United Kingdom",
        urls: ["https://www.gov.uk/government/ministers/prime-minister"],
        term_start: "2024-07-05",
        term_end: null,
      },
      {
        id: "gb:monarch:charles",
        name: "Charles III",
        office: "King of the United Kingdom",
        jurisdiction_name: "United Kingdom",
        urls: ["https://www.royal.uk/the-king"],
        term_start: "2022-09-08",
        term_end: null,
      },
    ],
    politics: [
      { id: "gb:elections", kind: "election", title: "UK elections and voting", subtitle: "Parliamentary, local, and devolved elections", url: "https://www.gov.uk/how-to-vote" },
      { id: "gb:parliament:bills", kind: "legislation", title: "UK Parliament bills and legislation", subtitle: "Commons and Lords legislation", url: "https://bills.parliament.uk/" },
    ],
    governmentTabs: [
      {
        id: "crown",
        label: "Crown",
        shortLabel: "Crown",
        items: [
          { id: "gb:crown:monarch", title: "Monarch", subtitle: "Head of state", url: "https://www.royal.uk/the-king" },
        ],
      },
      {
        id: "executive",
        label: "Government",
        shortLabel: "Gov.",
        items: [
          { id: "gb:exec:pm", title: "Prime Minister and Cabinet", subtitle: "Head of government and ministers", url: "https://www.gov.uk/government/organisations/prime-ministers-office-10-downing-street" },
          { id: "gb:exec:departments", title: "Ministerial departments", subtitle: "UK Government departments and agencies", url: "https://www.gov.uk/government/organisations" },
        ],
      },
      {
        id: "legislature",
        label: "Parliament",
        shortLabel: "Parl.",
        items: [
          { id: "gb:leg:commons", title: "House of Commons", subtitle: "Elected lower chamber", url: "https://www.parliament.uk/business/commons/" },
          { id: "gb:leg:lords", title: "House of Lords", subtitle: "Upper chamber", url: "https://www.parliament.uk/business/lords/" },
        ],
      },
      {
        id: "devolution",
        label: "Devolution",
        shortLabel: "Devol.",
        items: [
          { id: "gb:devolved", title: "Devolved governments", subtitle: "Scotland, Wales, and Northern Ireland", url: "https://www.gov.uk/guidance/devolution-settlement-scotland-wales-and-northern-ireland" },
        ],
      },
    ],
  },
  {
    key: "IN",
    name: "India",
    countryCode: "IN",
    aliases: ["in", "india", "republic of india"],
    flagUrl: `${FLAG_BASE}/in.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/256px-Emblem_of_India.svg.png",
    ],
    governmentType: "Federal parliamentary constitutional republic",
    politicalSystem: "President, Prime Minister, Council of Ministers, Parliament, states, and union territories",
    leadership: [
      {
        id: "in:president:murmu",
        name: "Droupadi Murmu",
        office: "President of India",
        jurisdiction_name: "India",
        urls: ["https://www.presidentofindia.gov.in/"],
        term_start: "2022-07-25",
        term_end: null,
      },
      {
        id: "in:pm:modi",
        name: "Narendra Modi",
        office: "Prime Minister of India",
        jurisdiction_name: "India",
        urls: ["https://www.pmindia.gov.in/"],
        term_start: "2014-05-26",
        term_end: null,
      },
    ],
    politics: [
      { id: "in:elections", kind: "election", title: "Election Commission of India", subtitle: "National and state elections", url: "https://www.eci.gov.in/" },
      { id: "in:parliament", kind: "legislation", title: "Parliament of India", subtitle: "Lok Sabha and Rajya Sabha proceedings", url: "https://sansad.in/" },
    ],
    governmentTabs: [
      {
        id: "executive",
        label: "Executive",
        shortLabel: "Exec",
        items: [
          { id: "in:exec:president", title: "President of India", subtitle: "Head of state", url: "https://www.presidentofindia.gov.in/" },
          { id: "in:exec:pm", title: "Prime Minister and Council of Ministers", subtitle: "Head of government and union executive", url: "https://www.pmindia.gov.in/" },
        ],
      },
      {
        id: "legislature",
        label: "Parliament",
        shortLabel: "Parl.",
        items: [
          { id: "in:leg:lok-sabha", title: "Lok Sabha", subtitle: "House of the People", url: "https://sansad.in/ls" },
          { id: "in:leg:rajya-sabha", title: "Rajya Sabha", subtitle: "Council of States", url: "https://sansad.in/rs" },
        ],
      },
      {
        id: "federalism",
        label: "States",
        shortLabel: "States",
        items: [
          { id: "in:states", title: "States and union territories", subtitle: "Federal state-level governments", url: "https://www.india.gov.in/" },
        ],
      },
      {
        id: "judiciary",
        label: "Judiciary",
        shortLabel: "Courts",
        items: [
          { id: "in:court:supreme", title: "Supreme Court of India", subtitle: "Highest constitutional court", url: "https://www.sci.gov.in/" },
        ],
      },
    ],
  },
  {
    key: "AU",
    name: "Australia",
    countryCode: "AU",
    aliases: ["au", "australia", "commonwealth of australia"],
    flagUrl: `${FLAG_BASE}/au.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Coat_of_arms_of_Australia.svg/256px-Coat_of_arms_of_Australia.svg.png",
    ],
    governmentType: "Federal parliamentary constitutional monarchy",
    politicalSystem: "Crown, Governor-General, Prime Minister, Cabinet, Parliament, states, and territories",
    leadership: [
      {
        id: "au:pm:albanese",
        name: "Anthony Albanese",
        office: "Prime Minister of Australia",
        jurisdiction_name: "Australia",
        urls: ["https://www.pm.gov.au/"],
        term_start: "2022-05-23",
        term_end: null,
      },
      {
        id: "au:gg:mostyn",
        name: "Sam Mostyn",
        office: "Governor-General of Australia",
        jurisdiction_name: "Australia",
        urls: ["https://www.gg.gov.au/"],
        term_start: "2024-07-01",
        term_end: null,
      },
      {
        id: "au:monarch:charles",
        name: "Charles III",
        office: "King of Australia",
        jurisdiction_name: "Australia",
        urls: ["https://www.royal.uk/the-king"],
        term_start: "2022-09-08",
        term_end: null,
      },
    ],
    politics: [
      { id: "au:elections", kind: "election", title: "Australian Electoral Commission", subtitle: "Federal elections and electoral boundaries", url: "https://www.aec.gov.au/" },
      { id: "au:parliament", kind: "legislation", title: "Parliament of Australia", subtitle: "Bills, Hansard, committees, and members", url: "https://www.aph.gov.au/" },
    ],
    governmentTabs: [
      {
        id: "crown",
        label: "Crown",
        shortLabel: "Crown",
        items: [
          { id: "au:crown:king", title: "King of Australia", subtitle: "Head of state represented by the Governor-General", url: "https://www.royal.uk/the-king" },
          { id: "au:crown:gg", title: "Governor-General", subtitle: "Representative of the Crown", url: "https://www.gg.gov.au/" },
        ],
      },
      {
        id: "executive",
        label: "Government",
        shortLabel: "Gov.",
        items: [
          { id: "au:exec:pm", title: "Prime Minister and Cabinet", subtitle: "Head of government and federal executive", url: "https://www.pm.gov.au/" },
        ],
      },
      {
        id: "legislature",
        label: "Parliament",
        shortLabel: "Parl.",
        items: [
          { id: "au:leg:house", title: "House of Representatives", subtitle: "Lower house", url: "https://www.aph.gov.au/About_Parliament/House_of_Representatives" },
          { id: "au:leg:senate", title: "Senate", subtitle: "Upper house", url: "https://www.aph.gov.au/About_Parliament/Senate" },
        ],
      },
      {
        id: "federalism",
        label: "States",
        shortLabel: "States",
        items: [
          { id: "au:states", title: "States and territories", subtitle: "Federal-state-territory governance", url: "https://www.australia.gov.au/" },
        ],
      },
    ],
  },
  {
    key: "BR",
    name: "Brazil",
    countryCode: "BR",
    aliases: ["br", "brazil", "brasil", "federative republic of brazil"],
    flagUrl: `${FLAG_BASE}/br.png`,
    sealUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Coat_of_arms_of_Brazil.svg/256px-Coat_of_arms_of_Brazil.svg.png",
    ],
    governmentType: "Federal presidential constitutional republic",
    politicalSystem: "President, National Congress, Federal Supreme Court, states, and municipalities",
    leadership: [
      {
        id: "br:president:lula",
        name: "Luiz Inacio Lula da Silva",
        office: "President of Brazil",
        party: "Workers' Party",
        jurisdiction_name: "Brazil",
        urls: ["https://www.gov.br/planalto/"],
        term_start: "2023-01-01",
        term_end: null,
      },
      {
        id: "br:vp:alckmin",
        name: "Geraldo Alckmin",
        office: "Vice President of Brazil",
        jurisdiction_name: "Brazil",
        urls: ["https://www.gov.br/planalto/"],
        term_start: "2023-01-01",
        term_end: null,
      },
    ],
    politics: [
      { id: "br:elections", kind: "election", title: "Superior Electoral Court", subtitle: "Elections and electoral justice", url: "https://www.tse.jus.br/" },
      { id: "br:congress", kind: "legislation", title: "National Congress", subtitle: "Chamber of Deputies and Federal Senate", url: "https://www.congressonacional.leg.br/" },
    ],
    governmentTabs: [
      {
        id: "executive",
        label: "Presidency",
        shortLabel: "Exec",
        items: [
          { id: "br:exec:presidency", title: "Presidency of the Republic", subtitle: "Head of state and head of government", url: "https://www.gov.br/planalto/" },
          { id: "br:exec:ministries", title: "Federal ministries", subtitle: "Executive branch ministries and agencies", url: "https://www.gov.br/pt-br/orgaos-do-governo" },
        ],
      },
      {
        id: "legislature",
        label: "Congress",
        shortLabel: "Cong.",
        items: [
          { id: "br:leg:deputies", title: "Chamber of Deputies", subtitle: "Lower chamber", url: "https://www.camara.leg.br/" },
          { id: "br:leg:senate", title: "Federal Senate", subtitle: "Upper chamber", url: "https://www12.senado.leg.br/" },
        ],
      },
      {
        id: "judiciary",
        label: "Judiciary",
        shortLabel: "Courts",
        items: [
          { id: "br:court:stf", title: "Federal Supreme Court", subtitle: "Highest constitutional court", url: "https://portal.stf.jus.br/" },
        ],
      },
      {
        id: "federalism",
        label: "States",
        shortLabel: "States",
        items: [
          { id: "br:states", title: "States and municipalities", subtitle: "Federal state and municipal governance", url: "https://www.gov.br/pt-br/temas/estados-e-municipios" },
        ],
      },
    ],
  },
  {
    key: "FR",
    name: "France",
    countryCode: "FR",
    aliases: ["fr", "france", "french republic", "paris"],
    flagUrl: `${FLAG_BASE}/fr.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Arms_of_the_French_Republic.svg?width=256"],
    governmentType: "Unitary semi-presidential constitutional republic",
    politicalSystem: "President, Prime Minister, Council of Ministers, Parliament, and constitutional judiciary",
    leadership: [
      { id: "fr:president:macron", name: "Emmanuel Macron", office: "President of France", jurisdiction_name: "France", urls: ["https://www.elysee.fr/en/"], term_start: "2017-05-14", term_end: null },
      { id: "fr:pm:lecornu", name: "Sebastian Lecornu", office: "Prime Minister of France", jurisdiction_name: "France", urls: ["https://www.gouvernement.fr/en"], term_start: "2025-10-10", term_end: null },
    ],
    politics: [
      { id: "fr:elections", kind: "election", title: "French elections", subtitle: "Ministry of the Interior election results and civic information", url: "https://www.elections.interieur.gouv.fr/" },
      { id: "fr:legislation", kind: "legislation", title: "French legislation", subtitle: "National Assembly and Senate lawmaking", url: "https://www.legifrance.gouv.fr/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Presidency", shortLabel: "Exec", items: [
        { id: "fr:exec:elysee", title: "Elysee Palace", subtitle: "President of the Republic", url: "https://www.elysee.fr/en/" },
        { id: "fr:exec:government", title: "Government of France", subtitle: "Prime Minister and ministers", url: "https://www.gouvernement.fr/en" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "fr:leg:assembly", title: "National Assembly", subtitle: "Lower house", url: "https://www.assemblee-nationale.fr/" },
        { id: "fr:leg:senate", title: "Senate", subtitle: "Upper house", url: "https://www.senat.fr/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "fr:court:constitutional", title: "Constitutional Council", subtitle: "Constitutional review", url: "https://www.conseil-constitutionnel.fr/en" },
      ] },
      { id: "local", label: "Territorial", shortLabel: "Local", items: [
        { id: "fr:local:service-public", title: "Local authorities", subtitle: "Communes, departments, and regions", url: "https://www.service-public.fr/particuliers/vosdroits/N19804?lang=en" },
      ] },
    ],
  },
  {
    key: "DE",
    name: "Germany",
    countryCode: "DE",
    aliases: ["de", "germany", "federal republic of germany", "berlin"],
    flagUrl: `${FLAG_BASE}/de.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_arms_of_Germany.svg?width=256"],
    governmentType: "Federal parliamentary republic",
    politicalSystem: "Federal President, Chancellor, Federal Government, Bundestag, Bundesrat, and federal courts",
    leadership: [
      { id: "de:president:steinmeier", name: "Frank-Walter Steinmeier", office: "Federal President of Germany", jurisdiction_name: "Germany", urls: ["https://www.bundespraesident.de/EN/Home/home_node.html"], term_start: "2017-03-19", term_end: null },
      { id: "de:chancellor:merz", name: "Friedrich Merz", office: "Chancellor of Germany", jurisdiction_name: "Germany", urls: ["https://www.bundeskanzler.de/bk-en"], term_start: "2025-05-06", term_end: null },
    ],
    politics: [
      { id: "de:elections", kind: "election", title: "Federal elections", subtitle: "Federal Returning Officer", url: "https://www.bundeswahlleiterin.de/en.html" },
      { id: "de:legislation", kind: "legislation", title: "Federal legislation", subtitle: "Bundestag legislation and proceedings", url: "https://www.bundestag.de/en" },
    ],
    governmentTabs: [
      { id: "executive", label: "Federal Govt.", shortLabel: "Govt", items: [
        { id: "de:exec:president", title: "Federal President", subtitle: "Head of state", url: "https://www.bundespraesident.de/EN/Home/home_node.html" },
        { id: "de:exec:chancellor", title: "Federal Chancellor", subtitle: "Head of government", url: "https://www.bundeskanzler.de/bk-en" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "de:leg:bundestag", title: "Bundestag", subtitle: "Federal parliament", url: "https://www.bundestag.de/en" },
        { id: "de:leg:bundesrat", title: "Bundesrat", subtitle: "Federal council of states", url: "https://www.bundesrat.de/EN/homepage/homepage-node.html" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "de:court:bverfg", title: "Federal Constitutional Court", subtitle: "Constitutional court", url: "https://www.bundesverfassungsgericht.de/EN/Homepage/home_node.html" },
      ] },
      { id: "federalism", label: "Lander", shortLabel: "States", items: [
        { id: "de:states", title: "Federal states", subtitle: "State governments and administrations", url: "https://www.bundesregierung.de/breg-en/federal-government/federal-states" },
      ] },
    ],
  },
  {
    key: "IT",
    name: "Italy",
    countryCode: "IT",
    aliases: ["it", "italy", "italian republic", "rome"],
    flagUrl: `${FLAG_BASE}/it.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_Italy.svg?width=256"],
    governmentType: "Unitary parliamentary republic",
    politicalSystem: "President, Council of Ministers, Parliament, regions, and constitutional judiciary",
    leadership: [
      { id: "it:president:mattarella", name: "Sergio Mattarella", office: "President of Italy", jurisdiction_name: "Italy", urls: ["https://www.quirinale.it/"], term_start: "2015-02-03", term_end: null },
      { id: "it:pm:meloni", name: "Giorgia Meloni", office: "Prime Minister of Italy", jurisdiction_name: "Italy", urls: ["https://www.governo.it/en"], term_start: "2022-10-22", term_end: null },
    ],
    politics: [
      { id: "it:elections", kind: "election", title: "Italian elections", subtitle: "Ministry of the Interior electoral services", url: "https://elezioni.interno.gov.it/" },
      { id: "it:legislation", kind: "legislation", title: "Italian legislation", subtitle: "Parliament and official law portal", url: "https://www.normattiva.it/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Government", shortLabel: "Govt", items: [
        { id: "it:exec:president", title: "President of the Republic", subtitle: "Head of state", url: "https://www.quirinale.it/" },
        { id: "it:exec:pm", title: "Council of Ministers", subtitle: "Prime Minister and cabinet", url: "https://www.governo.it/en" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "it:leg:camera", title: "Chamber of Deputies", subtitle: "Lower chamber", url: "https://www.camera.it/" },
        { id: "it:leg:senato", title: "Senate of the Republic", subtitle: "Upper chamber", url: "https://www.senato.it/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "it:court:constitutional", title: "Constitutional Court", subtitle: "Constitutional justice", url: "https://www.cortecostituzionale.it/" },
      ] },
      { id: "regions", label: "Regions", shortLabel: "Regions", items: [
        { id: "it:regions", title: "Regions and local authorities", subtitle: "Regional governance", url: "https://www.regioni.it/" },
      ] },
    ],
  },
  {
    key: "ES",
    name: "Spain",
    countryCode: "ES",
    aliases: ["es", "spain", "kingdom of spain", "madrid"],
    flagUrl: `${FLAG_BASE}/es.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_Arms_of_Spain.svg?width=256"],
    governmentType: "Parliamentary constitutional monarchy",
    politicalSystem: "Crown, President of the Government, Council of Ministers, Cortes Generales, autonomous communities, and courts",
    leadership: [
      { id: "es:king:felipe", name: "Felipe VI", office: "King of Spain", jurisdiction_name: "Spain", urls: ["https://www.casareal.es/EN/Paginas/home.aspx"], term_start: "2014-06-19", term_end: null },
      { id: "es:pm:sanchez", name: "Pedro Sanchez", office: "President of the Government of Spain", jurisdiction_name: "Spain", urls: ["https://www.lamoncloa.gob.es/lang/en/Paginas/index.aspx"], term_start: "2018-06-02", term_end: null },
    ],
    politics: [
      { id: "es:elections", kind: "election", title: "Spanish elections", subtitle: "Ministry of the Interior election results", url: "https://infoelectoral.interior.gob.es/en/" },
      { id: "es:legislation", kind: "legislation", title: "Cortes Generales", subtitle: "Congress and Senate proceedings", url: "https://www.cortesgenerales.es/" },
    ],
    governmentTabs: [
      { id: "crown", label: "Crown", shortLabel: "Crown", items: [
        { id: "es:crown:king", title: "Royal Household", subtitle: "Head of state", url: "https://www.casareal.es/EN/Paginas/home.aspx" },
      ] },
      { id: "executive", label: "Government", shortLabel: "Govt", items: [
        { id: "es:exec:moncloa", title: "La Moncloa", subtitle: "President and Council of Ministers", url: "https://www.lamoncloa.gob.es/lang/en/Paginas/index.aspx" },
      ] },
      { id: "legislature", label: "Cortes", shortLabel: "Cortes", items: [
        { id: "es:leg:congress", title: "Congress of Deputies", subtitle: "Lower chamber", url: "https://www.congreso.es/en" },
        { id: "es:leg:senate", title: "Senate", subtitle: "Upper chamber", url: "https://www.senado.es/web/index.html?lang=en" },
      ] },
      { id: "autonomies", label: "Autonomies", shortLabel: "Auto.", items: [
        { id: "es:autonomous", title: "Autonomous communities", subtitle: "Regional governments", url: "https://administracion.gob.es/" },
      ] },
    ],
  },
  {
    key: "BE",
    name: "Belgium",
    countryCode: "BE",
    aliases: ["be", "belgium", "kingdom of belgium", "brussels"],
    flagUrl: `${FLAG_BASE}/be.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Great_coat_of_arms_of_Belgium.svg?width=256"],
    governmentType: "Federal parliamentary constitutional monarchy",
    politicalSystem: "King, Prime Minister, federal government, federal parliament, regions, communities, and courts",
    leadership: [
      { id: "be:king:philippe", name: "Philippe", office: "King of the Belgians", jurisdiction_name: "Belgium", urls: ["https://www.monarchie.be/en"], term_start: "2013-07-21", term_end: null },
      { id: "be:pm:de-wever", name: "Bart De Wever", office: "Prime Minister of Belgium", jurisdiction_name: "Belgium", urls: ["https://www.belgium.be/en"], term_start: "2025-02-03", term_end: null },
    ],
    politics: [
      { id: "be:elections", kind: "election", title: "Belgian elections", subtitle: "Federal election information", url: "https://elections.fgov.be/" },
      { id: "be:legislation", kind: "legislation", title: "Federal Parliament", subtitle: "Chamber and Senate", url: "https://www.fed-parl.be/" },
    ],
    governmentTabs: [
      { id: "crown", label: "Crown", shortLabel: "Crown", items: [
        { id: "be:crown:king", title: "Belgian Monarchy", subtitle: "Head of state", url: "https://www.monarchie.be/en" },
      ] },
      { id: "executive", label: "Federal Govt.", shortLabel: "Govt", items: [
        { id: "be:exec:federal", title: "Federal government", subtitle: "Prime Minister and ministers", url: "https://www.belgium.be/en" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "be:leg:chamber", title: "Chamber of Representatives", subtitle: "Lower chamber", url: "https://www.dekamer.be/" },
        { id: "be:leg:senate", title: "Senate", subtitle: "Upper chamber", url: "https://www.senate.be/" },
      ] },
      { id: "federalism", label: "Regions", shortLabel: "Regions", items: [
        { id: "be:regions", title: "Regions and communities", subtitle: "Federal entities", url: "https://www.belgium.be/en/about_belgium/government/federale_staat" },
      ] },
    ],
  },
  {
    key: "NL",
    name: "Netherlands",
    countryCode: "NL",
    aliases: ["nl", "netherlands", "kingdom of the netherlands", "amsterdam"],
    flagUrl: `${FLAG_BASE}/nl.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Royal_coat_of_arms_of_the_Netherlands.svg?width=256"],
    governmentType: "Parliamentary constitutional monarchy",
    politicalSystem: "King, Prime Minister, Council of Ministers, States General, municipalities, provinces, and courts",
    leadership: [
      { id: "nl:king:willem-alexander", name: "Willem-Alexander", office: "King of the Netherlands", jurisdiction_name: "Netherlands", urls: ["https://www.royal-house.nl/"], term_start: "2013-04-30", term_end: null },
      { id: "nl:pm:jetten", name: "Rob Jetten", office: "Prime Minister of the Netherlands", jurisdiction_name: "Netherlands", urls: ["https://www.government.nl/"], term_start: "2026-01-01", term_end: null },
    ],
    politics: [
      { id: "nl:elections", kind: "election", title: "Dutch elections", subtitle: "Electoral Council", url: "https://english.kiesraad.nl/" },
      { id: "nl:legislation", kind: "legislation", title: "States General", subtitle: "Senate and House of Representatives", url: "https://www.staten-generaal.nl/" },
    ],
    governmentTabs: [
      { id: "crown", label: "Crown", shortLabel: "Crown", items: [
        { id: "nl:crown:king", title: "Royal House", subtitle: "Head of state", url: "https://www.royal-house.nl/" },
      ] },
      { id: "executive", label: "Government", shortLabel: "Govt", items: [
        { id: "nl:exec:gov", title: "Government of the Netherlands", subtitle: "Prime Minister and ministries", url: "https://www.government.nl/" },
      ] },
      { id: "legislature", label: "States Gen.", shortLabel: "Parl.", items: [
        { id: "nl:leg:house", title: "House of Representatives", subtitle: "Lower chamber", url: "https://www.houseofrepresentatives.nl/" },
        { id: "nl:leg:senate", title: "Senate", subtitle: "Upper chamber", url: "https://www.eerstekamer.nl/" },
      ] },
      { id: "local", label: "Local", shortLabel: "Local", items: [
        { id: "nl:local", title: "Municipalities and provinces", subtitle: "Decentralized government", url: "https://www.government.nl/topics/municipalities" },
      ] },
    ],
  },
  {
    key: "ZA",
    name: "South Africa",
    countryCode: "ZA",
    aliases: ["za", "south africa", "republic of south africa", "johannesburg", "cape town"],
    flagUrl: `${FLAG_BASE}/za.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_arms_of_South_Africa.svg?width=256"],
    governmentType: "Parliamentary republic with an executive presidency",
    politicalSystem: "President elected by the National Assembly, Cabinet, bicameral Parliament, provinces, and constitutional courts",
    leadership: [
      { id: "za:president:ramaphosa", name: "Cyril Ramaphosa", office: "President of South Africa", jurisdiction_name: "South Africa", urls: ["https://www.thepresidency.gov.za/"], term_start: "2018-02-15", term_end: null },
      { id: "za:deputy-president:mashatile", name: "Paul Mashatile", office: "Deputy President of South Africa", jurisdiction_name: "South Africa", urls: ["https://www.thepresidency.gov.za/"], term_start: "2023-03-07", term_end: null },
    ],
    politics: [
      { id: "za:elections", kind: "election", title: "South African elections", subtitle: "Electoral Commission of South Africa", url: "https://www.elections.org.za/" },
      { id: "za:legislation", kind: "legislation", title: "Parliament of South Africa", subtitle: "National Assembly and National Council of Provinces", url: "https://www.parliament.gov.za/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Presidency", shortLabel: "Exec", items: [
        { id: "za:exec:presidency", title: "The Presidency", subtitle: "President and Deputy President", url: "https://www.thepresidency.gov.za/" },
        { id: "za:exec:gov", title: "National government", subtitle: "Departments and services", url: "https://www.gov.za/" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "za:leg:parliament", title: "Parliament", subtitle: "National Assembly and NCOP", url: "https://www.parliament.gov.za/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "za:court:constitutional", title: "Constitutional Court", subtitle: "Highest constitutional court", url: "https://www.concourt.org.za/" },
      ] },
      { id: "provinces", label: "Provinces", shortLabel: "Prov.", items: [
        { id: "za:provinces", title: "Provincial government", subtitle: "Nine provincial governments", url: "https://www.gov.za/about-government/contact-directory/provincial-government" },
      ] },
    ],
  },
  {
    key: "NG",
    name: "Nigeria",
    countryCode: "NG",
    aliases: ["ng", "nigeria", "federal republic of nigeria", "lagos", "abuja"],
    flagUrl: `${FLAG_BASE}/ng.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_arms_of_Nigeria.svg?width=256"],
    governmentType: "Federal presidential constitutional republic",
    politicalSystem: "President, Federal Executive Council, National Assembly, states, and federal courts",
    leadership: [
      { id: "ng:president:tinubu", name: "Bola Tinubu", office: "President of Nigeria", jurisdiction_name: "Nigeria", urls: ["https://statehouse.gov.ng/"], term_start: "2023-05-29", term_end: null },
      { id: "ng:vice-president:shettima", name: "Kashim Shettima", office: "Vice President of Nigeria", jurisdiction_name: "Nigeria", urls: ["https://statehouse.gov.ng/"], term_start: "2023-05-29", term_end: null },
    ],
    politics: [
      { id: "ng:elections", kind: "election", title: "Nigerian elections", subtitle: "Independent National Electoral Commission", url: "https://www.inecnigeria.org/" },
      { id: "ng:legislation", kind: "legislation", title: "National Assembly", subtitle: "Senate and House of Representatives", url: "https://nass.gov.ng/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Presidency", shortLabel: "Exec", items: [
        { id: "ng:exec:statehouse", title: "State House", subtitle: "President and Vice President", url: "https://statehouse.gov.ng/" },
        { id: "ng:exec:gov", title: "Federal ministries", subtitle: "Federal Executive Council and ministries", url: "https://www.fedcivilservice.gov.ng/" },
      ] },
      { id: "legislature", label: "Assembly", shortLabel: "NASS", items: [
        { id: "ng:leg:senate", title: "Senate", subtitle: "Upper chamber", url: "https://nass.gov.ng/" },
        { id: "ng:leg:house", title: "House of Representatives", subtitle: "Lower chamber", url: "https://nass.gov.ng/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "ng:court:supreme", title: "Supreme Court of Nigeria", subtitle: "Highest court", url: "https://supremecourt.gov.ng/" },
      ] },
      { id: "states", label: "States", shortLabel: "States", items: [
        { id: "ng:states", title: "States and FCT", subtitle: "Subnational governments", url: "https://www.nigeria.gov.ng/" },
      ] },
    ],
  },
  {
    key: "EG",
    name: "Egypt",
    countryCode: "EG",
    aliases: ["eg", "egypt", "arab republic of egypt", "cairo"],
    flagUrl: `${FLAG_BASE}/eg.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Coat_of_arms_of_Egypt.svg?width=256"],
    governmentType: "Semi-presidential republic",
    politicalSystem: "President, Prime Minister, Cabinet, bicameral Parliament, governorates, and courts",
    leadership: [
      { id: "eg:president:sisi", name: "Abdel Fattah el-Sisi", office: "President of Egypt", jurisdiction_name: "Egypt", urls: ["https://www.presidency.eg/en/"], term_start: "2014-06-08", term_end: null },
      { id: "eg:pm:madbouly", name: "Mostafa Madbouly", office: "Prime Minister of Egypt", jurisdiction_name: "Egypt", urls: ["https://www.cabinet.gov.eg/"], term_start: "2018-06-14", term_end: null },
    ],
    politics: [
      { id: "eg:elections", kind: "election", title: "Egyptian elections", subtitle: "National Elections Authority", url: "https://www.elections.eg/" },
      { id: "eg:legislation", kind: "legislation", title: "Egyptian Parliament", subtitle: "House of Representatives and Senate", url: "https://www.parliament.gov.eg/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Executive", shortLabel: "Exec", items: [
        { id: "eg:exec:presidency", title: "Presidency", subtitle: "President of the Republic", url: "https://www.presidency.eg/en/" },
        { id: "eg:exec:cabinet", title: "Cabinet", subtitle: "Prime Minister and ministries", url: "https://www.cabinet.gov.eg/" },
      ] },
      { id: "legislature", label: "Parliament", shortLabel: "Parl.", items: [
        { id: "eg:leg:house", title: "House of Representatives", subtitle: "Lower chamber", url: "https://www.parliament.gov.eg/" },
        { id: "eg:leg:senate", title: "Senate", subtitle: "Upper chamber", url: "https://www.senate.gov.eg/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "eg:court:scc", title: "Supreme Constitutional Court", subtitle: "Constitutional court", url: "https://www.sccourt.gov.eg/" },
      ] },
      { id: "governorates", label: "Governorates", shortLabel: "Govs", items: [
        { id: "eg:governorates", title: "Governorates", subtitle: "Local administration", url: "https://www.egypt.gov.eg/" },
      ] },
    ],
  },
  {
    key: "TR",
    name: "Turkey",
    countryCode: "TR",
    aliases: ["tr", "turkey", "turkiye", "republic of turkey", "istanbul", "ankara"],
    flagUrl: `${FLAG_BASE}/tr.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Seal_of_the_President_of_Turkey.svg?width=256"],
    governmentType: "Unitary presidential constitutional republic",
    politicalSystem: "President, Cabinet, Grand National Assembly, provinces, and courts",
    leadership: [
      { id: "tr:president:erdogan", name: "Recep Tayyip Erdogan", office: "President of Turkey", jurisdiction_name: "Turkey", urls: ["https://www.tccb.gov.tr/en/"], term_start: "2014-08-28", term_end: null },
      { id: "tr:vice-president:yilmaz", name: "Cevdet Yilmaz", office: "Vice President of Turkey", jurisdiction_name: "Turkey", urls: ["https://www.tccb.gov.tr/en/"], term_start: "2023-06-03", term_end: null },
    ],
    politics: [
      { id: "tr:elections", kind: "election", title: "Turkish elections", subtitle: "Supreme Election Council", url: "https://www.ysk.gov.tr/" },
      { id: "tr:legislation", kind: "legislation", title: "Grand National Assembly", subtitle: "Parliamentary legislation", url: "https://www.tbmm.gov.tr/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Presidency", shortLabel: "Exec", items: [
        { id: "tr:exec:presidency", title: "Presidency of Turkey", subtitle: "President and vice president", url: "https://www.tccb.gov.tr/en/" },
        { id: "tr:exec:ministries", title: "Cabinet ministries", subtitle: "Executive ministries", url: "https://www.turkiye.gov.tr/" },
      ] },
      { id: "legislature", label: "Assembly", shortLabel: "TBMM", items: [
        { id: "tr:leg:tbmm", title: "Grand National Assembly", subtitle: "Unicameral legislature", url: "https://www.tbmm.gov.tr/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "tr:court:constitutional", title: "Constitutional Court", subtitle: "Constitutional review", url: "https://www.anayasa.gov.tr/en/" },
      ] },
      { id: "provinces", label: "Provinces", shortLabel: "Prov.", items: [
        { id: "tr:provinces", title: "Provincial administration", subtitle: "Governors and municipalities", url: "https://www.turkiye.gov.tr/" },
      ] },
    ],
  },
  {
    key: "KR",
    name: "South Korea",
    countryCode: "KR",
    aliases: ["kr", "korea", "south korea", "korea south", "republic of korea", "seoul"],
    flagUrl: `${FLAG_BASE}/kr.png`,
    sealUrls: ["https://commons.wikimedia.org/wiki/Special:FilePath/Emblem_of_South_Korea.svg?width=256"],
    governmentType: "Unitary presidential constitutional republic",
    politicalSystem: "President, Prime Minister, State Council, National Assembly, local governments, and courts",
    leadership: [
      { id: "kr:president:lee", name: "Lee Jae Myung", office: "President of South Korea", jurisdiction_name: "South Korea", urls: ["https://www.president.go.kr/"], term_start: "2025-06-04", term_end: null },
      { id: "kr:pm:kim", name: "Kim Min-seok", office: "Prime Minister of South Korea", jurisdiction_name: "South Korea", urls: ["https://www.opm.go.kr/en/"], term_start: "2025-06-24", term_end: null },
    ],
    politics: [
      { id: "kr:elections", kind: "election", title: "South Korean elections", subtitle: "National Election Commission", url: "https://www.nec.go.kr/site/eng/main.do" },
      { id: "kr:legislation", kind: "legislation", title: "National Assembly", subtitle: "Legislation and proceedings", url: "https://korea.assembly.go.kr:447/" },
    ],
    governmentTabs: [
      { id: "executive", label: "Executive", shortLabel: "Exec", items: [
        { id: "kr:exec:president", title: "Office of the President", subtitle: "Head of state and government", url: "https://www.president.go.kr/" },
        { id: "kr:exec:pm", title: "Prime Minister", subtitle: "Government coordination", url: "https://www.opm.go.kr/en/" },
      ] },
      { id: "legislature", label: "Assembly", shortLabel: "NA", items: [
        { id: "kr:leg:assembly", title: "National Assembly", subtitle: "Unicameral legislature", url: "https://korea.assembly.go.kr:447/" },
      ] },
      { id: "judiciary", label: "Judiciary", shortLabel: "Courts", items: [
        { id: "kr:court:supreme", title: "Supreme Court", subtitle: "Highest court", url: "https://eng.scourt.go.kr/" },
        { id: "kr:court:constitutional", title: "Constitutional Court", subtitle: "Constitutional review", url: "https://english.ccourt.go.kr/" },
      ] },
      { id: "local", label: "Local", shortLabel: "Local", items: [
        { id: "kr:local", title: "Local governments", subtitle: "Provinces, metropolitan cities, and municipalities", url: "https://www.korea.net/Government/Administration/Local-Governments" },
      ] },
    ],
  },
]

function normalizeToken(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
}

function profileMatches(profile: CountryGovernmentProfile, token: string): boolean {
  if (!token) return false
  const code = normalizeToken(profile.countryCode)
  if (code && token === code) return true
  if (token === normalizeToken(profile.name)) return true
  return profile.aliases.some((alias) => {
    const normalizedAlias = normalizeToken(alias)
    if (normalizedAlias.length <= 3) return token === normalizedAlias
    return token === normalizedAlias || token.includes(normalizedAlias)
  })
}

export function resolveCountryGovernmentProfile(value?: string | null): CountryGovernmentProfile | null {
  const token = normalizeToken(value)
  if (!token) return null
  return COUNTRY_GOVERNMENT_PROFILES.find((profile) => profileMatches(profile, token)) ?? null
}

export function resolveGovernmentProfilesForViewport(input: {
  place?: ViewportPlaceLike | null
  jurisdictionStack?: JurisdictionEntry[]
  macroRegion?: string | null
}): CountryGovernmentProfile[] {
  const tokens = new Set<string>()
  const hasExplicitCountry = Boolean(input.place?.countryCode || input.place?.country)
  const add = (value?: string | null) => {
    const token = normalizeToken(value)
    if (token) tokens.add(token)
  }

  add(input.place?.countryCode)
  add(input.place?.country)
  add(input.place?.displayName)
  for (const entry of input.jurisdictionStack ?? []) {
    add(entry.code)
    add(entry.name)
  }
  if (!hasExplicitCountry) add(input.macroRegion)

  const profiles: CountryGovernmentProfile[] = []
  const push = (profile: CountryGovernmentProfile | null) => {
    if (!profile || profiles.some((item) => item.key === profile.key)) return
    profiles.push(profile)
  }

  for (const token of tokens) {
    push(resolveCountryGovernmentProfile(token))
  }

  if (!hasExplicitCountry && (tokens.has("europe") || [...tokens].some((token) => token.includes("european union")))) {
    push(resolveCountryGovernmentProfile("EU"))
    push(resolveCountryGovernmentProfile("GB"))
  }

  if (profiles.length === 0 && tokens.has("north america")) {
    push(resolveCountryGovernmentProfile("US"))
    push(resolveCountryGovernmentProfile("CA"))
    push(resolveCountryGovernmentProfile("MX"))
  }

  return profiles
}
