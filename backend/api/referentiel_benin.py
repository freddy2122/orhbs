"""Référentiel territorial officiel : 12 départements, 34 zones sanitaires, structures types."""

from api.models import Structure

# Populations départementales (projections INSAE / PNDS, arrondies)
DEPARTEMENTS = [
    ("alibori", "Alibori", 968_000),
    ("atacora", "Atacora", 969_000),
    ("atlantique", "Atlantique", 1_364_000),
    ("borgou", "Borgou", 1_155_000),
    ("collines", "Collines", 717_000),
    ("couffo", "Couffo", 741_000),
    ("donga", "Donga", 543_000),
    ("littoral", "Littoral", 678_000),
    ("mono", "Mono", 495_000),
    ("oueme", "Ouémé", 1_122_000),
    ("plateau", "Plateau", 624_000),
    ("zou", "Zou", 851_000),
]

# 34 zones sanitaires du Ministère de la Santé
ZONES_SANITAIRES = [
    ("zs-banikoara", "ZS Banikoara", "alibori"),
    ("zs-kandi", "ZS Kandi", "alibori"),
    ("zs-malanville", "ZS Malanville", "alibori"),
    ("zs-natitingou", "ZS Natitingou", "atacora"),
    ("zs-kouande", "ZS Kouandé", "atacora"),
    ("zs-tanguieta", "ZS Tanguiéta", "atacora"),
    ("zs-abomey-calavi", "ZS Abomey-Calavi", "atlantique"),
    ("zs-allada", "ZS Allada", "atlantique"),
    ("zs-ouidah", "ZS Ouidah", "atlantique"),
    ("zs-toffo", "ZS Toffo", "atlantique"),
    ("zs-parakou", "ZS Parakou", "borgou"),
    ("zs-nikki", "ZS Nikki", "borgou"),
    ("zs-tchaourou", "ZS Tchaourou", "borgou"),
    ("zs-bembereke", "ZS Bembèrèkè", "borgou"),
    ("zs-dassa", "ZS Dassa-Zoumè", "collines"),
    ("zs-savalou", "ZS Savalou", "collines"),
    ("zs-save", "ZS Savè", "collines"),
    ("zs-aplahoue", "ZS Aplahoué", "couffo"),
    ("zs-dogbo", "ZS Dogbo", "couffo"),
    ("zs-djougou", "ZS Djougou", "donga"),
    ("zs-bassila", "ZS Bassila", "donga"),
    ("zs-cotonou", "ZS Cotonou", "littoral"),
    ("zs-lokossa", "ZS Lokossa", "mono"),
    ("zs-come", "ZS Comè", "mono"),
    ("zs-porto-novo", "ZS Porto-Novo", "oueme"),
    ("zs-adjohoun", "ZS Adjohoun", "oueme"),
    ("zs-seme-kpodji", "ZS Sèmè-Kpodji", "oueme"),
    ("zs-pobe", "ZS Pobè", "plateau"),
    ("zs-ketou", "ZS Kétou", "plateau"),
    ("zs-sakete", "ZS Sakété", "plateau"),
    ("zs-abomey", "ZS Abomey", "zou"),
    ("zs-bohicon", "ZS Bohicon", "zou"),
    ("zs-cove", "ZS Covè", "zou"),
    ("zs-zogbodomey", "ZS Zogbodomey", "zou"),
]

STRUCTURES_NATIONALES = [
    ("cnhu-hkm", "CNHU Hubert Koutoukou Maga", Structure.TypeStructure.CNHU, "littoral", "zs-cotonou"),
    ("chu-mel", "CHU-MEL Cotonou", Structure.TypeStructure.CHU, "littoral", "zs-cotonou"),
    ("chu-parakou", "CHUD Borgou-Alibori", Structure.TypeStructure.CHU, "borgou", "zs-parakou"),
    ("chu-porto-novo", "CHUD Ouémé-Plateau", Structure.TypeStructure.CHU, "oueme", "zs-porto-novo"),
    ("chu-natitingou", "CHUD Atacora-Donga", Structure.TypeStructure.CHU, "atacora", "zs-natitingou"),
    ("chu-abomey", "CHUD Zou-Collines", Structure.TypeStructure.CHU, "zou", "zs-abomey"),
]

def structures_operationnelles():
    """1 hôpital de zone par ZS officielle, 1 DDS par département.

    Les CS, CSCOM et établissements privés sont saisis par l'administrateur.
    """
    rows = []
    for zone_code, zone_nom, dept_code in ZONES_SANITAIRES:
        chef_lieu = zone_nom.replace("ZS ", "")
        slug = zone_code.replace("zs-", "")
        rows.append((f"hz-{slug}", f"HZ {chef_lieu}", Structure.TypeStructure.HZ, dept_code, zone_code))
    for dept_code, dept_nom, _ in DEPARTEMENTS:
        rows.append(
            (
                f"dds-{dept_code}",
                f"DDS {dept_nom}",
                Structure.TypeStructure.DIRECTION,
                dept_code,
                None,
            )
        )
    return rows
