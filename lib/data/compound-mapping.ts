// Comprehensive mapping of fungal compounds from mycosoft.org/compounds
export const compounds = {
  // Hericium erinaceus compounds
  "hericenone-b": {
    id: "CS123456",
    name: "Hericenone B",
    formula: "C27H32O5",
    molecularWeight: 436.54,
    chemicalClass: "Cyathane diterpenoid",
    description: "A cyathane diterpenoid that promotes nerve growth factor (NGF) synthesis",
    sourceSpecies: ["Hericium erinaceus"],
    biologicalActivity: ["NGF synthesis promotion", "Neurite outgrowth stimulation", "Neuroprotective effects"],
    references: [
      {
        doi: "10.1016/j.bmc.2008.08.037",
        title:
          "Hericenones and erinacines: stimulators of nerve growth factor (NGF) biosynthesis in Hericium erinaceus",
      },
    ],
  },

  // Ganoderma lucidum compounds
  "ganoderic-acid": {
    id: "CS345671",
    name: "Ganoderic Acid",
    formula: "C30H44O7",
    molecularWeight: 516.67,
    chemicalClass: "Triterpene",
    description: "A triterpenoid with immunomodulating properties",
    sourceSpecies: ["Ganoderma lucidum"],
    biologicalActivity: ["Immunomodulation", "Anti-inflammatory", "Hepatoprotective"],
  },

  // Psilocybe compounds
  psilocybin: {
    id: "CS789012",
    name: "Psilocybin",
    formula: "C12H17N2O4P",
    molecularWeight: 284.25,
    chemicalClass: "Tryptamine alkaloid",
    description: "A naturally occurring psychedelic compound",
    sourceSpecies: ["Psilocybe cubensis", "Psilocybe semilanceata"],
    biologicalActivity: ["Serotonin receptor agonist", "Neuroplasticity promotion"],
    legalStatus: "Schedule I controlled substance in most countries",
  },

  // Amanita muscaria compounds
  muscimol: {
    id: "CS789013",
    name: "Muscimol",
    formula: "C4H6N2O2",
    molecularWeight: 114.1,
    chemicalClass: "Amino acid derivative",
    description: "Primary psychoactive compound in Amanita muscaria",
    sourceSpecies: ["Amanita muscaria"],
    biologicalActivity: ["GABA receptor agonist", "CNS effects"],
  },

  // Trametes versicolor compounds
  psk: {
    id: "CS456781",
    name: "Polysaccharide-K (PSK)",
    formula: "Complex polysaccharide",
    molecularWeight: 100000,
    chemicalClass: "Protein-bound polysaccharide",
    description: "An immunomodulating complex from Turkey Tail mushroom",
    sourceSpecies: ["Trametes versicolor"],
    biologicalActivity: ["Immune system enhancement", "Anti-tumor activity", "Infection resistance"],
  },

  // Cordyceps compounds
  cordycepin: {
    id: "CS234561",
    name: "Cordycepin",
    formula: "C10H13N5O3",
    molecularWeight: 251.24,
    chemicalClass: "Nucleoside analog",
    description: "A bioactive nucleoside with various therapeutic properties",
    sourceSpecies: ["Cordyceps militaris", "Cordyceps sinensis"],
    biologicalActivity: ["Anti-tumor activity", "Anti-inflammatory", "Immunomodulation"],
  },

  // Inonotus obliquus compounds
  "betulinic-acid": {
    id: "CS567891",
    name: "Betulinic Acid",
    formula: "C30H48O3",
    molecularWeight: 456.7,
    chemicalClass: "Triterpene",
    description: "A bioactive triterpene with anti-cancer properties",
    sourceSpecies: ["Inonotus obliquus"],
    biologicalActivity: ["Anti-tumor activity", "Anti-inflammatory", "Anti-viral"],
  },

  // Pleurotus ostreatus compounds
  lovastatin: {
    id: "CS901234",
    name: "Lovastatin",
    formula: "C24H36O5",
    molecularWeight: 404.55,
    chemicalClass: "Statin",
    description: "A naturally occurring statin compound",
    sourceSpecies: ["Pleurotus ostreatus"],
    biologicalActivity: ["Cholesterol reduction", "HMG-CoA reductase inhibition"],
  },

  // Lentinula edodes compounds
  lentinan: {
    id: "CS345678",
    name: "Lentinan",
    formula: "Complex polysaccharide",
    molecularWeight: 500000,
    chemicalClass: "Beta-glucan",
    description: "A high-molecular-weight polysaccharide",
    sourceSpecies: ["Lentinula edodes"],
    biologicalActivity: ["Immune system modulation", "Anti-tumor activity"],
  },

  // Grifola frondosa compounds
  grifolan: {
    id: "CS456789",
    name: "Grifolan",
    formula: "Complex polysaccharide",
    molecularWeight: 800000,
    chemicalClass: "Beta-glucan",
    description: "A bioactive beta-glucan from Maitake",
    sourceSpecies: ["Grifola frondosa"],
    biologicalActivity: ["Immune system enhancement", "Anti-tumor effects"],
  },

  // Agaricus blazei compounds
  blazein: {
    id: "CS567890",
    name: "Blazein",
    formula: "C27H46O3",
    molecularWeight: 418.65,
    chemicalClass: "Steroid",
    description: "A bioactive steroid compound",
    sourceSpecies: ["Agaricus blazei"],
    biologicalActivity: ["Anti-tumor activity", "Immunomodulation"],
  },

  // Add more compounds from mycosoft.org/compounds...
}
