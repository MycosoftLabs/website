// components/ancestry/biological-tools.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function BiologicalTools() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biological Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Access commonly used biological tools for fungal taxonomy.</p>
          <Button variant="outline" asChild>
            <a href="https://blast.ncbi.nlm.nih.gov/Blast.cgi" target="_blank" rel="noopener noreferrer">
              BLAST
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="http://www.clustal.org/" target="_blank" rel="noopener noreferrer">
              ClustalW
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://mafft.cbrc.jp/alignment/software/" target="_blank" rel="noopener noreferrer">
              MAFFT
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.r-project.org/" target="_blank" rel="noopener noreferrer">
              R
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.python.org/" target="_blank" rel="noopener noreferrer">
              Python
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://cytoscape.org/" target="_blank" rel="noopener noreferrer">
              Cytoscape
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.htslib.org/" target="_blank" rel="noopener noreferrer">
              Samtools
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://bedtools.readthedocs.io/en/latest/" target="_blank" rel="noopener noreferrer">
              Bedtools
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://www.bioinformatics.babraham.ac.uk/projects/fastqc/"
              target="_blank"
              rel="noopener noreferrer"
            >
              FastQC
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.ensembl.org/index.html" target="_blank" rel="noopener noreferrer">
              Ensembl
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.uniprot.org/" target="_blank" rel="noopener noreferrer">
              UniProt
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
