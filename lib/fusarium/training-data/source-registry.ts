/**
 * Canonical, non-executing inventory of training-data candidates supplied on
 * September 2, 2026. Attachment URLs, access labels, and size descriptions are
 * unverified source claims. They are never acquisition authority.
 *
 * Fusarium uses NLM to mean Nature Learning Model. The attachments' phrase
 * "Neural Listening Machine" is retained only as legacy acoustic-corpus
 * terminology and is routed through SINE rather than defining a second NLM.
 */

export const TRAINING_SOURCE_REGISTRY_SCHEMA = "fusarium-training-source-registry/v1" as const
export const TRAINING_SOURCE_REGISTRY_VERSION = "2026-09-02.1" as const
export const MARKDOWN_NUMBERED_SOURCE_COUNT = 74 as const
export const PDF_ONLY_SOURCE_COUNT = 4 as const

export const NLM_TERMINOLOGY_BOUNDARY = {
  id: "nlm-terminology-boundary/v1",
  fusariumMeaning: "Nature Learning Model",
  legacyAttachmentMeaning: "Neural Listening Machine",
  acousticApplication: "SINE",
  rule: "Attachment references to the Neural Listening Machine are legacy acoustic-corpus terminology. Acoustic datasets, models, and tools enter through SINE; they do not define or rename the Fusarium Nature Learning Model.",
} as const

export const TRAINING_SOURCE_DOCUMENTS = [
  {
    id: "nlm-training-data-sources-md",
    title: "NLM_TRAINING_DATA_SOURCES (1).md",
    sha256: "254eefe9d75a9aa56103589963fcc032c1fdeef43a006eb00637978a7472fd46",
    sourceKind: "markdown-numbered-registry",
    sourceTerminology: "Neural Listening Machine",
    instructionsAreAuthority: false,
  },
  {
    id: "nlm-training-data-catalog-pdf",
    title: "NLM_Training_Data_Catalog (1).pdf",
    sha256: "edb7878c2ed20f73b8a69ad5cfad7cb5f7afff8f291380a6ec4a03f5fef07192",
    sourceKind: "pdf-human-catalog",
    sourceTerminology: "Neural Listening Machine",
    instructionsAreAuthority: false,
  },
] as const

export type TrainingSourceDocumentId = typeof TRAINING_SOURCE_DOCUMENTS[number]["id"]

export type TrainingSourceModality =
  | "acoustic"
  | "optical"
  | "biodiversity-metadata"
  | "oceanographic-context"
  | "bathymetry"
  | "magnetic-mad"
  | "ais-geospatial"
  | "model-artifact"
  | "sonar-imagery"
  | "software"

export type TrainingCatalogTarget =
  | "sine-source-catalog/v1"
  | "sine-context-source-catalog/v1"
  | "sine-model-catalog/v1"
  | "sine-tooling-catalog/v1"
  | "bluesight-source-catalog/v1"
  | "magnetic-mad-source-catalog/v1"
  | "nature-learning-model-context-catalog/v1"

export type TrainingSourceCategory =
  | "underwater-acoustic-databases"
  | "vessel-propeller-acoustics"
  | "marine-biological-acoustics"
  | "aerial-drone-bird-acoustics"
  | "explosion-military-acoustics"
  | "environmental-sound-classification"
  | "oceanographic-context"
  | "bathymetry-seafloor-terrain"
  | "magnetic-anomaly-detection"
  | "ais-geospatial-maritime"
  | "pretrained-acoustic-models"
  | "sonar-imagery-target-detection"
  | "passive-acoustic-software"

export interface TrainingSourceDocumentReferenceV1 {
  documentId: TrainingSourceDocumentId
  locator: string
}

export interface TrainingSourceAcquisitionBoundaryV1 {
  currentUrl: { state: "unverified"; value: null; attachmentClaim: string | null }
  releaseVersion: { state: "unverified"; value: null }
  license: { state: "unverified"; identifier: null; termsUrl: null }
  rights: {
    state: "unverified"
    commercialUse: null
    governmentUse: null
    trainingUse: null
    derivatives: null
    redistribution: null
    modelWeightDistribution: null
  }
  expectedSize: { state: "unverified"; bytes: null; objects: null; attachmentClaim: string | null }
  checksum: { state: "not-computed"; algorithm: null; value: null }
  destination: { state: "unassigned"; storageClass: null; location: null }
  approval: { state: "not-approved"; approver: null; approvedAt: null; scope: null }
}

export interface TrainingSourceCandidateV1 {
  id: string
  origin: "markdown-numbered" | "pdf-only"
  sourceOrdinal: string | null
  title: string
  sourceTypeClaim: string
  sourceCategory: TrainingSourceCategory
  modalities: readonly TrainingSourceModality[]
  catalogTargets: readonly TrainingCatalogTarget[]
  sourceDocumentRefs: readonly TrainingSourceDocumentReferenceV1[]
  attachmentAccessClaim: string | null
  legacySourceTerminology: "Neural Listening Machine"
  canonicalPlatformTerminology: "Nature Learning Model"
  terminologyBoundaryId: typeof NLM_TERMINOLOGY_BOUNDARY.id
  acquisitionState: "candidate"
  executionAuthority: false
  acquisition: TrainingSourceAcquisitionBoundaryV1
}

interface SectionRoute {
  sourceCategory: TrainingSourceCategory
  modalities: readonly TrainingSourceModality[]
  catalogTargets: readonly TrainingCatalogTarget[]
}

const SECTION_ROUTES: Readonly<Record<string, SectionRoute>> = {
  "1": { sourceCategory: "underwater-acoustic-databases", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "2": { sourceCategory: "vessel-propeller-acoustics", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "3": { sourceCategory: "marine-biological-acoustics", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "4": { sourceCategory: "aerial-drone-bird-acoustics", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "5": { sourceCategory: "explosion-military-acoustics", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "6": { sourceCategory: "environmental-sound-classification", modalities: ["acoustic"], catalogTargets: ["sine-source-catalog/v1"] },
  "7": { sourceCategory: "oceanographic-context", modalities: ["oceanographic-context"], catalogTargets: ["sine-context-source-catalog/v1", "nature-learning-model-context-catalog/v1"] },
  "8": { sourceCategory: "bathymetry-seafloor-terrain", modalities: ["bathymetry"], catalogTargets: ["sine-context-source-catalog/v1", "nature-learning-model-context-catalog/v1"] },
  "9": { sourceCategory: "magnetic-anomaly-detection", modalities: ["magnetic-mad"], catalogTargets: ["magnetic-mad-source-catalog/v1", "nature-learning-model-context-catalog/v1"] },
  "10": { sourceCategory: "ais-geospatial-maritime", modalities: ["ais-geospatial"], catalogTargets: ["sine-context-source-catalog/v1", "bluesight-source-catalog/v1", "nature-learning-model-context-catalog/v1"] },
  "11": { sourceCategory: "pretrained-acoustic-models", modalities: ["acoustic", "model-artifact"], catalogTargets: ["sine-model-catalog/v1"] },
  "12": { sourceCategory: "sonar-imagery-target-detection", modalities: ["sonar-imagery"], catalogTargets: ["bluesight-source-catalog/v1", "sine-source-catalog/v1"] },
  "13": { sourceCategory: "passive-acoustic-software", modalities: ["software"], catalogTargets: ["sine-tooling-catalog/v1"] },
}

function failClosedAcquisition(
  attachmentClaimedUrl: string | null,
  attachmentSizeClaim: string | null,
): TrainingSourceAcquisitionBoundaryV1 {
  return {
    currentUrl: { state: "unverified", value: null, attachmentClaim: attachmentClaimedUrl },
    releaseVersion: { state: "unverified", value: null },
    license: { state: "unverified", identifier: null, termsUrl: null },
    rights: {
      state: "unverified",
      commercialUse: null,
      governmentUse: null,
      trainingUse: null,
      derivatives: null,
      redistribution: null,
      modelWeightDistribution: null,
    },
    expectedSize: { state: "unverified", bytes: null, objects: null, attachmentClaim: attachmentSizeClaim },
    checksum: { state: "not-computed", algorithm: null, value: null },
    destination: { state: "unassigned", storageClass: null, location: null },
    approval: { state: "not-approved", approver: null, approvedAt: null, scope: null },
  }
}

const markdownCandidate = (
  id: string,
  sourceOrdinal: string,
  title: string,
  sourceTypeClaim: string,
  attachmentClaimedUrl: string | null,
  attachmentAccessClaim: string | null,
  attachmentSizeClaim: string | null,
): TrainingSourceCandidateV1 => {
  const section = sourceOrdinal.split(".", 1)[0]
  const route = SECTION_ROUTES[section]
  if (!route) throw new Error(`No inert catalog route for source section ${section}`)
  const opticalUxo = id === "uxo_zenodo"
  return {
    id,
    origin: "markdown-numbered",
    sourceOrdinal,
    title,
    sourceTypeClaim,
    sourceCategory: route.sourceCategory,
    modalities: opticalUxo ? [...route.modalities, "optical"] : route.modalities,
    catalogTargets: opticalUxo ? [...route.catalogTargets, "bluesight-source-catalog/v1"] : route.catalogTargets,
    sourceDocumentRefs: [{ documentId: "nlm-training-data-sources-md", locator: `section ${sourceOrdinal}` }],
    attachmentAccessClaim,
    legacySourceTerminology: "Neural Listening Machine",
    canonicalPlatformTerminology: "Nature Learning Model",
    terminologyBoundaryId: NLM_TERMINOLOGY_BOUNDARY.id,
    acquisitionState: "candidate",
    executionAuthority: false,
    acquisition: failClosedAcquisition(attachmentClaimedUrl, attachmentSizeClaim),
  }
}

const pdfOnlyCandidate = (
  id: string,
  page: number,
  title: string,
  sourceTypeClaim: string,
  attachmentClaimedUrl: string,
  attachmentAccessClaim: string,
  attachmentSizeClaim: string | null,
  route: SectionRoute,
): TrainingSourceCandidateV1 => ({
  id,
  origin: "pdf-only",
  sourceOrdinal: null,
  title,
  sourceTypeClaim,
  sourceCategory: route.sourceCategory,
  modalities: route.modalities,
  catalogTargets: route.catalogTargets,
  sourceDocumentRefs: [{ documentId: "nlm-training-data-catalog-pdf", locator: `page ${page}` }],
  attachmentAccessClaim,
  legacySourceTerminology: "Neural Listening Machine",
  canonicalPlatformTerminology: "Nature Learning Model",
  terminologyBoundaryId: NLM_TERMINOLOGY_BOUNDARY.id,
  acquisitionState: "candidate",
  executionAuthority: false,
  acquisition: failClosedAcquisition(attachmentClaimedUrl, attachmentSizeClaim),
})

const m = markdownCandidate

export const MARKDOWN_TRAINING_SOURCE_CANDIDATES: readonly TrainingSourceCandidateV1[] = [
  m("noaa_nrs", "1.1", "NOAA Ocean Noise Reference Station Network (NRS)", "Continuous hydrophone recordings", "https://www.ncei.noaa.gov/maps/passive-acoustic-data/", "open", "Petabytes (multi-year continuous)"),
  m("mbari_pacific_sound", "1.2", "MBARI Open Acoustic Data (Pacific Sound)", "Broadband hydrophone recordings", "https://www.mbari.org/project/open-acoustic-data/", "open (AWS S3)", "~2 TB/month per sensor"),
  m("sanctsound", "1.3", "NOAA-Navy SanctSound (Sanctuary Soundscapes)", "Passive acoustic + AIS + environmental metadata", "https://sanctsound.ioos.us/", "open", "Multi-TB, 30 sites, 4 years (2018-2022)"),
  m("iqoe_portal", "1.4", "IQOE Acoustic Data Portal", "Meta-portal to global PAM datasets", "https://www.iqoe.org/acoustic-data-portal", "open (portal; individual dataset access varies)", "Index to hundreds of datasets worldwide"),
  m("uk_acoustics_directory", "1.5", "UK Acoustics Network Open Access Data Directory", "Curated meta-directory of 50+ underwater acoustic datasets", "https://acoustics.ac.uk/open-access-underwater-acoustics-data/", "open", "Links to 50+ datasets"),
  m("ncei_pad", "1.6", "NCEI Passive Acoustic Data Archive", "National PAM archive (NRS + SanctSound + regional)", "https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncei.pad%3APAD_Collection", "open", "Petabytes"),
  m("onc", "1.7", "Ocean Networks Canada (ONC)", "Continuous multi-sensor ocean data (hydrophones + CTD + currents)", "https://www.oceannetworks.ca/", "open (CC-BY-ND, registration required)", "Petabytes (decades)"),
  m("emso", "1.8", "EMSO-ERIC Observatory Network", "European seafloor observatory data (14 sites)", "https://emso.eu/observatories/", "open (varies by observatory)", "Multi-TB"),
  m("ioos", "1.9", "IOOS Regional Ocean Observing Systems", "Regional PAM + oceanographic data (US Pacific / Atlantic / Hawaii)", "https://ioos.us/regions", "open (US federally funded)", "Multi-TB"),
  m("galway_bay", "1.10", "Galway Bay Observatory Hydrophone", "Raw hydrophone recordings (200 kHz omni-directional)", "https://data.gov.ie/dataset/galway-bay-observatory-hydrophone-raw-data", "open (CC license)", "Multi-year continuous"),
  m("mobysound", "1.11", "MobySound / CIMRS", "Long-term PAM (equatorial Pacific)", "https://www.mobysound.org/index.html", "open", "Multi-year datasets"),
  m("glacier_bay", "1.12", "Glacier Bay Underwater Sounds (NPS)", "Labelled underwater sound clips (whales, seals, vessels, weather)", "https://www.nps.gov/glba/learn/nature/soundclips.htm", "open", "Small (curated clips)"),
  m("noaa_seasounds", "1.13", "NOAA Ocean Explorer Sea Sounds", "Curated ocean sound reference (geological, biological, weather)", "https://oceanexplorer.noaa.gov/explorations/sound01/background/seasounds/seasounds.html", "open", "Small"),
  m("shipsear", "2.1", "ShipsEar", "Labelled ship-radiated noise (11 vessel categories)", "https://www.sciencedirect.com/science/article/abs/pii/S0003682X16301566", "academic (via publication request)", "90 recordings, 11 classes"),
  m("deepship", "2.2", "DeepShip", "Ship noise spectrograms + raw audio (4 vessel types)", "https://www.emergentmind.com/topics/deepship-and-shipsear-benchmarks", "academic", "265 recordings, 4 classes"),
  m("ds3500", "2.3", "DS3500 (Enhanced ShipsEar)", "Real + simulated ship noise with distance/depth labels", "https://huggingface.co/datasets/peng7554/DS3500", "open (Hugging Face)", "3,500 samples"),
  m("qiandaoear22", "2.4", "QiandaoEar22", "Vessel-specific noise signatures (individual vessel ID)", "https://arxiv.org/html/2406.04354v1", "academic (via publication)", "Research dataset"),
  m("hearmyship", "2.5", "HearMyShip", "Small vessel underwater radiated noise", "https://www.nature.com/articles/s41597-025-04584-x", "open (Scientific Data)", "Research dataset (2025)"),
  m("wolfset", "2.6", "Wolfset", "Multi-class underwater acoustic targets", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12311032/", "academic", "Research dataset"),
  m("kaggle_uasmr", "2.7", "Kaggle Underwater Acoustic Signal Modulation Recognition", "Simulated underwater acoustic signals", "https://www.kaggle.com/competitions/underwater-acoustic-signal-modulation-recognition/data", "open (CC-BY, Kaggle)", "Competition dataset"),
  m("watkins_whoi", "3.1", "Watkins Marine Mammal Sound Database (WHOI)", "Labelled marine mammal vocalizations (clicks, whistles, pulsed calls)", "https://www.whoi.edu/press-room/news-release/historic-marine-mammal-sound-archive-now-available-online/", "open", "1,700+ recordings, 60+ species"),
  m("dclde", "3.2", "DCLDE Workshop Datasets", "Annotated marine mammal recordings for benchmarking", "https://www.cetus.ucsd.edu/dclde/datasetDocumentation.html", "workshop-specific (some openly available)", "Multi-TB across workshop years"),
  m("noaa_fisheries_mma", "3.3", "NOAA Fisheries Marine Mammal Acoustics", "Marine mammal detection and monitoring data", "https://www.fisheries.noaa.gov/new-england-mid-atlantic/science-data/marine-mammal-acoustics", "open", "Large (multi-program)"),
  m("macaulay", "3.4", "Cornell Macaulay Library", "Natural history audio/video (marine mammals, fish, invertebrates + terrestrial)", "https://www.macaulaylibrary.org/", "open (Cornell Lab of Ornithology)", "Millions of recordings"),
  m("dtic_marine_sounds", "3.5", "DTIC Marine Animal Sound Database", "Military-compiled marine biological acoustic signatures", "https://apps.dtic.mil/sti/tr/pdf/ADA244694.pdf", "open (DTIC public)", "Reference document"),
  m("fishsounds", "3.6", "FishSounds.net", "Fish and invertebrate vocalizations", "https://fishsounds.net/", "open", "Growing database"),
  m("droneaudioset", "4.1", "DroneAudioset", "Labelled drone acoustic signatures (multiple types, distances, conditions)", "https://www.emergentmind.com/topics/droneaudioset", "academic", "Research dataset"),
  m("uav_32cat", "4.2", "32-Category Drone / UAV Sound Dataset", "Multi-class UAV recordings (32 categories, flight conditions, maneuvers)", "https://dael.euracoustics.org/confs/fa2023/data/articles/000049.pdf", "academic", "32 categories"),
  m("xenocanto", "4.3", "Xeno-canto Bird Sound Database", "Bird vocalizations by species (10,000+ species)", "https://xeno-canto.org/", "open (per-item Creative Commons)", "684,000+ recordings"),
  m("navfac_aircraft", "4.4", "NAVFAC Aircraft Sound Monitoring", "Military aircraft noise monitoring data", "https://www.navfac.navy.mil/Directorates/Public-Works/Products-and-Services/Aircraft-Sound-Monitoring/", "restricted (DoD/NAVFAC)", "Program-specific"),
  m("serdp_aircraft", "4.5", "SERDP Military Aircraft Noise Propagation", "Acoustic propagation models + validation data", "https://serdp-estcp.mil/projects/details/09cc2b4b-1d53-4b9c-b91a-f8d006279de5", "DoD research (SERDP/ESTCP)", null),
  m("uxo_zenodo", "5.1", "UXO Acoustic-Optical Dataset", "Multi-modal UXO detection (acoustic + optical)", "https://zenodo.org/records/11068046", "open (Zenodo, CC)", "Research dataset"),
  m("iogp_explosions", "5.2", "IOGP Underwater Explosions as Acoustic Sources", "Explosion signature characterization reference", "https://usrd.iogp.org/resource/underwater-explosions-as-acoustic-sources/", "open", null),
  m("shallow_explosions", "5.3", "Shallow Underwater Explosions Recordings", "Short-range shallow underwater explosion waveforms", "https://pubs.geoscienceworld.org/ssa/bssa/article/113/4/1542/618917/", "academic (SSA publication)", null),
  m("audioset", "6.1", "Google AudioSet", "Multi-label audio events (2M+ clips, 600+ categories)", "https://research.google.com/audioset/", "open metadata; source-media rights separate", "2+ million 10-second clips"),
  m("esc50", "6.2", "ESC-50 (Environmental Sound Classification)", "2,000 environmental sounds in 50 classes", "https://github.com/karolpiczak/ESC-50", "open", "2,000 clips, 50 classes"),
  m("urbansound8k", "6.3", "UrbanSound8K", "8,732 urban sound excerpts (10 classes: engine, siren, gunshot, etc.)", "https://urbansounddataset.weebly.com/urbansound8k.html", "open (academic license)", "8,732 clips"),
  m("fsd50k", "6.4", "FSD50K", "51,197 audio clips, 200 AudioSet classes, human-verified", "https://zenodo.org/records/4060432", "open (CC-BY claim)", "51,197 clips"),
  m("freesound", "6.5", "Freesound.org", "Community audio samples (500K+ sounds)", "https://freesound.org/", "per-item Creative Commons claims; account may be required", "500,000+ sounds"),
  m("bbc_sfx", "6.6", "BBC Sound Effects", "Professional sound effects (33K+ effects)", "https://sound-effects.bbcrewind.co.uk/", "free personal/educational/research claim", "33,000+ effects"),
  m("dcase", "6.7", "DCASE Challenge Datasets", "Multi-task audio classification benchmarks (9 tasks annually)", "https://dcase.community/challenge2024/index", "challenge-specific", "Thousands of clips per task"),
  m("woa_soundspeed", "7.1", "World Ocean Atlas (WOA) Sound Speed Profiles", "Global climatological T/S/sound-speed profiles", "https://staff.washington.edu/dushaw/WOA/", "open", "Global gridded data"),
  m("global_acoustic_params", "7.2", "Global Undersea Acoustic Parameters Dataset", "Pre-computed sound channel axis, critical depth, convergence zone ranges", "https://pmc.ncbi.nlm.nih.gov/articles/PMC11605126/", "open", "Global gridded"),
  m("ndbc", "7.3", "NDBC (National Data Buoy Center)", "Wind, wave, temperature, pressure, current data (1,400+ stations)", "https://www.ndbc.noaa.gov/", "open", "Decades of data"),
  m("navoceano_moods", "7.4", "NAVOCEANO MOODS", "Navy T/S/sound-speed profiles", "https://catalog.data.gov/dataset/temperature-salinity-and-sound-speed-profile-data-from-the-navoceano-master-oceanographic-obser", "public subset claim via Data.gov", "Comprehensive Navy archive"),
  m("copernicus_marine", "7.5", "Copernicus Marine Service", "Global/regional ocean products (SST, salinity, currents, sea level)", "https://data.marine.copernicus.eu/", "registration required", "Petabytes"),
  m("nasa_earthdata", "7.6", "NASA Earthdata Ocean Portal", "Satellite-derived SST, ocean color, SSH, wind, sea ice", "https://www.earthdata.nasa.gov/topics/ocean", "NASA Earthdata login", "Petabytes"),
  m("gebco_2025", "8.1", "GEBCO 2025 Global Bathymetric Grid", "Global ocean + land terrain (15 arc-second resolution)", "https://www.gebco.net/data-products/gridded-bathymetry-data", "open", "~4-8 GB per grid"),
  m("ibcao", "8.2", "IBCAO (Arctic Ocean)", "Arctic bathymetry (north of 64°N)", "https://www.gebco.net/data-products/gridded-bathymetry-data/arctic-ocean", "open (via GEBCO)", null),
  m("ibcso", "8.3", "IBCSO (Southern Ocean)", "Southern Ocean bathymetry", "https://ibcso.org/", "open", null),
  m("wmm2025", "9.1", "World Magnetic Model 2025 (WMM2025)", "Global geomagnetic field model (DoD/NATO standard)", "https://www.ncei.noaa.gov/products/world-magnetic-model", "open", "Small model-coefficient package"),
  m("emag2v3", "9.2", "EMAG2v3 (Earth Magnetic Anomaly Grid)", "Global magnetic anomaly grid (2 arc-minute, satellite+ship+airborne)", "https://www.ncei.noaa.gov/products/earth-magnetic-model-anomaly-grid-2", "open", "1.5 GB claim"),
  m("datagov_magnetic", "9.3", "Data.gov Magnetic Anomaly Datasets (14 datasets)", "Aeromagnetic surveys, marine magnetic profiles, regional compilations", "https://catalog.data.gov/dataset/?tags=magnetic+anomalies", "open", "14 datasets"),
  m("maid", "9.4", "MAID Dataset (ML-based Magnetic Anomaly Interpolation)", "Magnetic anomaly data + ML interpolation methods", "https://academic.oup.com/gji/article/245/2/ggag076/8494940", "academic", null),
  m("mag_intrusion", "9.5", "2D Magnetometer Network for Underwater Intrusion Detection", "Magnetometer network + AI for underwater intrusion detection (2025)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC12899529/", "open (PMC)", null),
  m("noaa_ais", "10.1", "NOAA AccessAIS", "Historical and near-real-time AIS vessel positions (US waters)", "https://coast.noaa.gov/digitalcoast/tools/ais.html", "open", "Billions of position reports"),
  m("ushant_ais", "10.2", "Ushant AIS Traffic Dataset", "Curated vessel trajectories (18.7M position reports)", "https://github.com/rtavenar/ushant_ais", "open", "18.7 million reports"),
  m("global_maritime_traffic", "10.3", "Global Maritime Traffic Density", "Worldwide AIS traffic density maps", "https://globalmaritimetraffic.org", "varies", null),
  m("marinecadastre", "10.4", "MarineCadastre.gov AIS Data", "Monthly nationwide US AIS data (since 2009)", "https://marinecadastre.gov/ais/", "open (US government)", "Terabytes"),
  m("panns", "11.1", "PANNs (Large-Scale Pretrained Audio Neural Networks)", "CNN14, ResNet38, etc. pre-trained on AudioSet (527 classes)", "https://github.com/qiuqiangkong/audioset_tagging_cnn", "open claim; code/weight/data rights separate", "~300 MB per model"),
  m("beats", "11.2", "BEATs (Audio Pre-Training with Acoustic Tokenizers)", "Audio transformer (bidirectional encoder, iterative pre-training)", "https://github.com/microsoft/unilm/tree/master/beats", "MIT code-license claim; checkpoint/data rights separate", null),
  m("ast", "11.3", "AST (Audio Spectrogram Transformer)", "Vision Transformer applied to audio spectrograms", "https://github.com/YuanGongND/ast", "open claim; code/weight/data rights separate", null),
  m("panns_deepship", "11.4", "PANN_Models_DeepShip (Underwater Transfer Learning)", "PANNs + Dense CNNs fine-tuned on DeepShip/ShipsEar", "https://github.com/doans/Underwater-Acoustic-Target-Classification-Based-on-Dense-Convolutional-Neural-Network", "open claim; artifact rights separate", null),
  m("uwtrl_meg", "11.5", "UWTRL-MEG (Underwater Target Recognition & Localization)", "Underwater acoustic recognition + range/depth estimation models", "https://huggingface.co/peng7554/UWTRL-MEG", "Hugging Face candidate; exact card and revision unverified", null),
  m("fish_classifier", "11.6", "Fish Sound Classifier", "Pre-trained fish sound classification model", "https://huggingface.co/axds/classify-fish-sounds", "Hugging Face candidate; exact card and revision unverified", null),
  m("underwater_snd", "11.7", "underwater_snd", "Underwater sound classification framework", "https://github.com/lucascesarfd/underwater_snd", "open claim; code/weight/data rights separate", null),
  m("frcnn_marine", "11.8", "Faster R-CNN Marine Mammal Detection", "Faster R-CNN for marine mammal spectrogram detection", "https://tethys.pnnl.gov/publications/deep-learning-model-detecting-classifying-multiple-marine-mammal-species-passive", "academic publication", null),
  m("opensonar", "12.1", "OpenSonarDatasets (Master Directory)", "Meta-directory of 20+ open sonar datasets", "https://github.com/remaro-network/OpenSonarDatasets", "open directory; child-source rights separate", null),
  m("uatd", "12.2", "UATD (Underwater Acoustic Target Detection Dataset)", "9,200+ multibeam FLS images (Tritech Gemini 1200ik)", "https://www.nature.com/articles/s41597-022-01854-w", "open (Figshare claim)", "9,200 images"),
  m("sctd", "12.3", "SCTD (Sonar Common Target Detection Dataset)", "Sonar target detection (Pascal VOC + COCO converter)", "https://github.com/freepoet/SCTD", "open claim", null),
  m("roboflow_sonar", "12.4", "Sonar Object Detection (Roboflow)", "7,848 FLS sonar images annotated for object detection", "https://universe.roboflow.com/datasetad/sonar-zsqwb", "Roboflow candidate; exact version/rights unverified", "7,848 images"),
  m("pamguard", "13.1", "PAMGuard", "Open-source PAM platform (detection, classification, localization, density estimation)", "https://www.pamguard.org/", "open-source claim", null),
  m("speechbrain", "13.2", "SpeechBrain", "PyTorch audio/speech ML toolkit (BEATs integration, classification, separation)", "https://speechbrain.readthedocs.io/", "open-source claim", null),
  m("librosa", "13.3", "Librosa", "Python audio analysis (MFCCs, spectrograms, chromagrams)", "https://librosa.org/", "open-source claim", null),
] as const

export const PDF_ONLY_TRAINING_SOURCE_CANDIDATES: readonly TrainingSourceCandidateV1[] = [
  pdfOnlyCandidate(
    "san_francisco_maritime_sound_library",
    4,
    "San Francisco Maritime Sound Library",
    "Historic maritime sound recordings",
    "https://maritime.org/sound/",
    "open-access claim",
    "Small curated collection",
    SECTION_ROUTES["1"],
  ),
  pdfOnlyCandidate(
    "xenocanto_gbif",
    9,
    "Xeno-canto via GBIF",
    "Bird sounds with structured biodiversity metadata",
    "https://www.gbif.org/dataset/b1047888-ae52-4179-9dd5-5448ea342a24",
    "open GBIF API claim; linked-media rights remain item-specific",
    "684,000+ occurrence records",
    {
      sourceCategory: "aerial-drone-bird-acoustics",
      modalities: ["acoustic", "biodiversity-metadata"],
      catalogTargets: ["sine-source-catalog/v1", "nature-learning-model-context-catalog/v1"],
    },
  ),
  pdfOnlyCandidate(
    "us_navy_science_of_sound",
    10,
    "U.S. Navy Science of Sound",
    "Reference and educational material",
    "https://www.usff.navy.mil/Community-Outreach/US-Navy-Stewards-of-the-Sea/Science-of-Sound/",
    "public-reference claim",
    "Reference material",
    SECTION_ROUTES["5"],
  ),
  pdfOnlyCandidate(
    "ubc_marine_mammal_sound_classification",
    18,
    "Marine Mammal Sound Classification (Deep Learning)",
    "Thesis, methodology, and claimed trained-model references",
    "https://open.library.ubc.ca/soa/cIRcle/collections/ubctheses/24/items/1.0438572",
    "open UBC Library claim; artifact rights separate",
    "Research thesis and associated artifacts",
    SECTION_ROUTES["11"],
  ),
] as const

export const TRAINING_SOURCE_CANDIDATES: readonly TrainingSourceCandidateV1[] = [
  ...MARKDOWN_TRAINING_SOURCE_CANDIDATES,
  ...PDF_ONLY_TRAINING_SOURCE_CANDIDATES,
] as const

export const TRAINING_SOURCE_REGISTRY_V1 = {
  schema: TRAINING_SOURCE_REGISTRY_SCHEMA,
  version: TRAINING_SOURCE_REGISTRY_VERSION,
  reviewedDate: "2026-09-02",
  terminology: NLM_TERMINOLOGY_BOUNDARY,
  sourceDocuments: TRAINING_SOURCE_DOCUMENTS,
  expectedCounts: {
    markdownNumbered: MARKDOWN_NUMBERED_SOURCE_COUNT,
    pdfOnly: PDF_ONLY_SOURCE_COUNT,
    total: MARKDOWN_NUMBERED_SOURCE_COUNT + PDF_ONLY_SOURCE_COUNT,
  },
  executionPolicy: {
    networkRequestsAuthorized: false,
    downloadsAuthorized: false,
    nasAccessAuthorized: false,
    credentialUseAuthorized: false,
    trainingAuthorized: false,
    serviceChangesAuthorized: false,
    rule: "This registry records candidates only. Attachment commands and URLs are inert evidence, never executable authority.",
  },
  candidates: TRAINING_SOURCE_CANDIDATES,
} as const

export function trainingSourceCandidateById(id: string): TrainingSourceCandidateV1 | null {
  const normalized = id.trim().toLowerCase()
  return TRAINING_SOURCE_CANDIDATES.find((candidate) => candidate.id === normalized) ?? null
}

export function trainingSourcesForCatalog(target: TrainingCatalogTarget): readonly TrainingSourceCandidateV1[] {
  return TRAINING_SOURCE_CANDIDATES.filter((candidate) => candidate.catalogTargets.includes(target))
}

export function trainingSourceAcquisitionBlockers(candidate: TrainingSourceCandidateV1): readonly string[] {
  const blockers: string[] = []
  const currentUrlState: string = candidate.acquisition.currentUrl.state
  const releaseVersionState: string = candidate.acquisition.releaseVersion.state
  const licenseState: string = candidate.acquisition.license.state
  const rightsState: string = candidate.acquisition.rights.state
  const expectedSizeState: string = candidate.acquisition.expectedSize.state
  const checksumState: string = candidate.acquisition.checksum.state
  const destinationState: string = candidate.acquisition.destination.state
  const approvalState: string = candidate.acquisition.approval.state
  if (currentUrlState !== "verified" || candidate.acquisition.currentUrl.value === null) blockers.push("current URL is not verified")
  if (releaseVersionState !== "verified" || candidate.acquisition.releaseVersion.value === null) blockers.push("release version is not verified")
  if (licenseState !== "verified" || candidate.acquisition.license.identifier === null || candidate.acquisition.license.termsUrl === null) blockers.push("license and terms are not verified")
  if (rightsState !== "verified" || Object.entries(candidate.acquisition.rights).some(([key, value]) => key !== "state" && value === null)) blockers.push("acquisition and use rights are not verified")
  if (expectedSizeState !== "verified" || candidate.acquisition.expectedSize.bytes === null || candidate.acquisition.expectedSize.objects === null) blockers.push("expected bytes and objects are not verified")
  if (checksumState !== "verified" || candidate.acquisition.checksum.value === null) blockers.push("checksum has not been computed and verified")
  if (destinationState !== "assigned" || candidate.acquisition.destination.location === null) blockers.push("destination is unassigned")
  if (approvalState !== "approved" || candidate.acquisition.approval.approver === null) blockers.push("human approval is absent")
  return blockers
}

function hasCanonicalFailClosedAcquisition(candidate: TrainingSourceCandidateV1): boolean {
  const boundary = candidate.acquisition
  return (
    boundary.currentUrl.state === "unverified" &&
    boundary.currentUrl.value === null &&
    boundary.releaseVersion.state === "unverified" &&
    boundary.releaseVersion.value === null &&
    boundary.license.state === "unverified" &&
    boundary.license.identifier === null &&
    boundary.license.termsUrl === null &&
    boundary.rights.state === "unverified" &&
    Object.entries(boundary.rights).every(([key, value]) => key === "state" || value === null) &&
    boundary.expectedSize.state === "unverified" &&
    boundary.expectedSize.bytes === null &&
    boundary.expectedSize.objects === null &&
    boundary.checksum.state === "not-computed" &&
    boundary.checksum.algorithm === null &&
    boundary.checksum.value === null &&
    boundary.destination.state === "unassigned" &&
    boundary.destination.storageClass === null &&
    boundary.destination.location === null &&
    boundary.approval.state === "not-approved" &&
    boundary.approval.approver === null &&
    boundary.approval.approvedAt === null &&
    boundary.approval.scope === null
  )
}

export function validateTrainingSourceRegistryV1(): readonly string[] {
  const issues: string[] = []
  const ids = new Set<string>()
  const ordinals = new Set<string>()
  if (MARKDOWN_TRAINING_SOURCE_CANDIDATES.length !== MARKDOWN_NUMBERED_SOURCE_COUNT) issues.push("Markdown source count mismatch")
  if (PDF_ONLY_TRAINING_SOURCE_CANDIDATES.length !== PDF_ONLY_SOURCE_COUNT) issues.push("PDF-only source count mismatch")
  for (const candidate of TRAINING_SOURCE_CANDIDATES) {
    if (!/^[a-z0-9][a-z0-9_]*$/.test(candidate.id) || ids.has(candidate.id)) issues.push(`invalid or duplicate candidate id: ${candidate.id}`)
    ids.add(candidate.id)
    if (!candidate.title || !candidate.sourceTypeClaim) issues.push(`${candidate.id}: missing title or source type`)
    if (!candidate.modalities.length || !candidate.catalogTargets.length) issues.push(`${candidate.id}: missing modality or catalog target`)
    if (!candidate.sourceDocumentRefs.length) issues.push(`${candidate.id}: missing source-document evidence`)
    if (candidate.legacySourceTerminology !== NLM_TERMINOLOGY_BOUNDARY.legacyAttachmentMeaning || candidate.canonicalPlatformTerminology !== NLM_TERMINOLOGY_BOUNDARY.fusariumMeaning) issues.push(`${candidate.id}: terminology boundary mismatch`)
    if (candidate.executionAuthority !== false || candidate.acquisitionState !== "candidate") issues.push(`${candidate.id}: candidate gained execution authority`)
    if (candidate.origin === "markdown-numbered") {
      if (!candidate.sourceOrdinal || !/^\d+\.\d+$/.test(candidate.sourceOrdinal) || ordinals.has(candidate.sourceOrdinal)) issues.push(`${candidate.id}: invalid or duplicate Markdown ordinal`)
      if (candidate.sourceOrdinal) ordinals.add(candidate.sourceOrdinal)
    }
    if (!hasCanonicalFailClosedAcquisition(candidate) || trainingSourceAcquisitionBlockers(candidate).length !== 8) {
      issues.push(`${candidate.id}: fail-closed acquisition boundary is incomplete`)
    }
  }
  const magnetic = trainingSourcesForCatalog("magnetic-mad-source-catalog/v1")
  if (magnetic.length !== 5 || magnetic.some((candidate) => !candidate.modalities.includes("magnetic-mad"))) issues.push("magnetic/MAD source coverage mismatch")
  return issues
}
