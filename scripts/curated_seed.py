"""Curated seed dataset of major data-center sites.

Hand-researched entries for hyperscaler cloud regions and well-known campuses.
Each row: (name, operator, lat, lng, country ISO-3166 alpha-2, city/region,
tier, status, type, power_capacity_mw or None, year_opened or None, source_url).

Coordinates for cloud *regions* are the approximate location of the region's
primary metro area (regions span multiple availability zones); this is
documented in the README methodology section. Power values are only set when
publicly reported; otherwise null. Never invent values.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

C = "confirmed"
P = "probable"
T = "theorized"
OP = "operational"
UC = "under construction"
PL = "planned"
HY = "hyperscale"
CO = "colocation"
AI = "ai training"
HPC = "hpc/supercomputer"
GOV = "government"
CR = "crypto mining"

AWS = "https://aws.amazon.com/about-aws/global-infrastructure/"
AZURE = "https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/"
GCP = "https://cloud.google.com/about/locations"
OCI = "https://www.oracle.com/cloud/data-regions/"
IBM = "https://www.ibm.com/cloud/data-centers"
ALI = "https://www.alibabacloud.com/global-locations"
META = "https://datacenters.atmeta.com/"
EQUINIX = "https://www.equinix.com/data-centers"

ROWS = [
    # --- AWS regions (approximate primary metro coordinates) ---
    ("AWS US East (N. Virginia)", "Amazon Web Services", 39.0, -77.5, "US", "Ashburn, Virginia", C, OP, HY, None, 2006, AWS),
    ("AWS US East (Ohio)", "Amazon Web Services", 40.0, -83.0, "US", "Columbus, Ohio", C, OP, HY, None, 2016, AWS),
    ("AWS US West (N. California)", "Amazon Web Services", 37.4, -122.1, "US", "San Francisco Bay Area, California", C, OP, HY, None, 2009, AWS),
    ("AWS US West (Oregon)", "Amazon Web Services", 45.6, -122.8, "US", "Portland, Oregon", C, OP, HY, None, 2011, AWS),
    ("AWS Canada (Central)", "Amazon Web Services", 45.5, -73.6, "CA", "Montreal, Quebec", C, OP, HY, None, 2016, AWS),
    ("AWS Canada West (Calgary)", "Amazon Web Services", 51.0, -114.1, "CA", "Calgary, Alberta", C, OP, HY, None, 2023, AWS),
    ("AWS South America (Sao Paulo)", "Amazon Web Services", -23.55, -46.63, "BR", "Sao Paulo", C, OP, HY, None, 2011, AWS),
    ("AWS Europe (Ireland)", "Amazon Web Services", 53.35, -6.26, "IE", "Dublin", C, OP, HY, None, 2007, AWS),
    ("AWS Europe (Frankfurt)", "Amazon Web Services", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, 2014, AWS),
    ("AWS Europe (London)", "Amazon Web Services", 51.5, -0.13, "GB", "London", C, OP, HY, None, 2016, AWS),
    ("AWS Europe (Paris)", "Amazon Web Services", 48.86, 2.35, "FR", "Paris", C, OP, HY, None, 2017, AWS),
    ("AWS Europe (Stockholm)", "Amazon Web Services", 59.33, 18.07, "SE", "Stockholm", C, OP, HY, None, 2018, AWS),
    ("AWS Europe (Milan)", "Amazon Web Services", 45.46, 9.19, "IT", "Milan", C, OP, HY, None, 2020, AWS),
    ("AWS Europe (Spain)", "Amazon Web Services", 41.65, -0.89, "ES", "Zaragoza", C, OP, HY, None, 2022, AWS),
    ("AWS Europe (Zurich)", "Amazon Web Services", 47.37, 8.54, "CH", "Zurich", C, OP, HY, None, 2022, AWS),
    ("AWS Asia Pacific (Tokyo)", "Amazon Web Services", 35.68, 139.69, "JP", "Tokyo", C, OP, HY, None, 2011, AWS),
    ("AWS Asia Pacific (Osaka)", "Amazon Web Services", 34.69, 135.5, "JP", "Osaka", C, OP, HY, None, 2021, AWS),
    ("AWS Asia Pacific (Seoul)", "Amazon Web Services", 37.57, 126.98, "KR", "Seoul", C, OP, HY, None, 2016, AWS),
    ("AWS Asia Pacific (Singapore)", "Amazon Web Services", 1.35, 103.82, "SG", "Singapore", C, OP, HY, None, 2010, AWS),
    ("AWS Asia Pacific (Sydney)", "Amazon Web Services", -33.87, 151.21, "AU", "Sydney", C, OP, HY, None, 2012, AWS),
    ("AWS Asia Pacific (Melbourne)", "Amazon Web Services", -37.81, 144.96, "AU", "Melbourne", C, OP, HY, None, 2023, AWS),
    ("AWS Asia Pacific (Mumbai)", "Amazon Web Services", 19.08, 72.88, "IN", "Mumbai", C, OP, HY, None, 2016, AWS),
    ("AWS Asia Pacific (Hyderabad)", "Amazon Web Services", 17.38, 78.49, "IN", "Hyderabad", C, OP, HY, None, 2022, AWS),
    ("AWS Asia Pacific (Hong Kong)", "Amazon Web Services", 22.32, 114.17, "HK", "Hong Kong", C, OP, HY, None, 2019, AWS),
    ("AWS Asia Pacific (Jakarta)", "Amazon Web Services", -6.21, 106.85, "ID", "Jakarta", C, OP, HY, None, 2021, AWS),
    ("AWS Middle East (Bahrain)", "Amazon Web Services", 26.23, 50.58, "BH", "Bahrain", C, OP, HY, None, 2019, AWS),
    ("AWS Middle East (UAE)", "Amazon Web Services", 25.2, 55.27, "AE", "Dubai / Abu Dhabi", C, OP, HY, None, 2022, AWS),
    ("AWS Israel (Tel Aviv)", "Amazon Web Services", 32.08, 34.78, "IL", "Tel Aviv", C, OP, HY, None, 2023, AWS),
    ("AWS Africa (Cape Town)", "Amazon Web Services", -33.92, 18.42, "ZA", "Cape Town", C, OP, HY, None, 2020, AWS),
    ("AWS Mexico (Central)", "Amazon Web Services", 20.59, -100.39, "MX", "Queretaro", C, OP, HY, None, 2025, AWS),
    ("AWS Europe (Germany) Sovereign Cloud", "Amazon Web Services", 52.52, 13.4, "DE", "Brandenburg", T, PL, HY, None, None, AWS),
    # --- Microsoft Azure regions ---
    ("Azure East US", "Microsoft Azure", 37.37, -79.18, "US", "Boydton, Virginia", C, OP, HY, None, 2010, AZURE),
    ("Azure East US 2", "Microsoft Azure", 36.82, -78.4, "US", "Virginia", C, OP, HY, None, 2014, AZURE),
    ("Azure West US 2", "Microsoft Azure", 47.23, -119.85, "US", "Quincy, Washington", C, OP, HY, None, 2016, AZURE),
    ("Azure West US 3", "Microsoft Azure", 33.45, -112.07, "US", "Phoenix, Arizona", C, OP, HY, None, 2020, AZURE),
    ("Azure Central US", "Microsoft Azure", 41.59, -93.62, "US", "Des Moines, Iowa", C, OP, HY, None, 2014, AZURE),
    ("Azure North Central US", "Microsoft Azure", 41.88, -87.63, "US", "Chicago, Illinois", C, OP, HY, None, 2014, AZURE),
    ("Azure South Central US", "Microsoft Azure", 29.42, -98.49, "US", "San Antonio, Texas", C, OP, HY, None, 2014, AZURE),
    ("Azure North Europe", "Microsoft Azure", 53.35, -6.26, "IE", "Dublin", C, OP, HY, None, 2009, AZURE),
    ("Azure West Europe", "Microsoft Azure", 52.37, 4.9, "NL", "Amsterdam", C, OP, HY, None, 2009, AZURE),
    ("Azure UK South", "Microsoft Azure", 51.5, -0.13, "GB", "London", C, OP, HY, None, 2016, AZURE),
    ("Azure Germany West Central", "Microsoft Azure", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, 2019, AZURE),
    ("Azure France Central", "Microsoft Azure", 48.86, 2.35, "FR", "Paris", C, OP, HY, None, 2018, AZURE),
    ("Azure Sweden Central", "Microsoft Azure", 60.67, 17.14, "SE", "Gavle", C, OP, HY, None, 2021, AZURE),
    ("Azure Norway East", "Microsoft Azure", 59.91, 10.75, "NO", "Oslo", C, OP, HY, None, 2019, AZURE),
    ("Azure Switzerland North", "Microsoft Azure", 47.37, 8.54, "CH", "Zurich", C, OP, HY, None, 2019, AZURE),
    ("Azure Italy North", "Microsoft Azure", 45.46, 9.19, "IT", "Milan", C, OP, HY, None, 2023, AZURE),
    ("Azure Spain Central", "Microsoft Azure", 40.42, -3.7, "ES", "Madrid", C, OP, HY, None, 2024, AZURE),
    ("Azure Poland Central", "Microsoft Azure", 52.23, 21.01, "PL", "Warsaw", C, OP, HY, None, 2023, AZURE),
    ("Azure Southeast Asia", "Microsoft Azure", 1.35, 103.82, "SG", "Singapore", C, OP, HY, None, 2010, AZURE),
    ("Azure East Asia", "Microsoft Azure", 22.32, 114.17, "HK", "Hong Kong", C, OP, HY, None, 2010, AZURE),
    ("Azure Japan East", "Microsoft Azure", 35.68, 139.69, "JP", "Tokyo", C, OP, HY, None, 2014, AZURE),
    ("Azure Australia East", "Microsoft Azure", -33.87, 151.21, "AU", "Sydney", C, OP, HY, None, 2014, AZURE),
    ("Azure Central India", "Microsoft Azure", 18.52, 73.86, "IN", "Pune", C, OP, HY, None, 2015, AZURE),
    ("Azure Korea Central", "Microsoft Azure", 37.57, 126.98, "KR", "Seoul", C, OP, HY, None, 2017, AZURE),
    ("Azure UAE North", "Microsoft Azure", 25.2, 55.27, "AE", "Dubai", C, OP, HY, None, 2019, AZURE),
    ("Azure South Africa North", "Microsoft Azure", -26.2, 28.05, "ZA", "Johannesburg", C, OP, HY, None, 2019, AZURE),
    ("Azure Brazil South", "Microsoft Azure", -23.55, -46.63, "BR", "Sao Paulo", C, OP, HY, None, 2014, AZURE),
    ("Azure Canada Central", "Microsoft Azure", 43.65, -79.38, "CA", "Toronto", C, OP, HY, None, 2016, AZURE),
    ("Azure Qatar Central", "Microsoft Azure", 25.29, 51.53, "QA", "Doha", C, OP, HY, None, 2022, AZURE),
    ("Azure Israel Central", "Microsoft Azure", 32.08, 34.78, "IL", "Tel Aviv", C, OP, HY, None, 2023, AZURE),
    ("Azure Mexico Central", "Microsoft Azure", 20.59, -100.39, "MX", "Queretaro", C, OP, HY, None, 2024, AZURE),
    ("Azure New Zealand North", "Microsoft Azure", -36.85, 174.76, "NZ", "Auckland", C, OP, HY, None, 2024, AZURE),
    ("Azure Indonesia Central", "Microsoft Azure", -6.21, 106.85, "ID", "Jakarta", C, OP, HY, None, 2025, AZURE),
    ("Azure Malaysia West", "Microsoft Azure", 3.14, 101.69, "MY", "Kuala Lumpur", C, OP, HY, None, 2025, AZURE),
    # --- Google Cloud regions ---
    ("Google Cloud us-east1", "Google Cloud", 33.2, -80.0, "US", "Moncks Corner, South Carolina", C, OP, HY, None, 2009, GCP),
    ("Google Cloud us-east4", "Google Cloud", 39.0, -77.5, "US", "Ashburn, Virginia", C, OP, HY, None, 2017, GCP),
    ("Google Cloud us-central1", "Google Cloud", 41.26, -95.86, "US", "Council Bluffs, Iowa", C, OP, HY, None, 2009, GCP),
    ("Google Cloud us-west1", "Google Cloud", 45.59, -121.18, "US", "The Dalles, Oregon", C, OP, HY, None, 2006, GCP),
    ("Google Cloud europe-west1", "Google Cloud", 50.45, 3.82, "BE", "St. Ghislain", C, OP, HY, None, 2010, GCP),
    ("Google Cloud europe-west2", "Google Cloud", 51.5, -0.13, "GB", "London", C, OP, HY, None, 2017, GCP),
    ("Google Cloud europe-west3", "Google Cloud", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, 2017, GCP),
    ("Google Cloud europe-west4", "Google Cloud", 53.45, 6.83, "NL", "Eemshaven", C, OP, HY, None, 2018, GCP),
    ("Google Cloud europe-north1", "Google Cloud", 60.57, 27.19, "FI", "Hamina", C, OP, HY, None, 2018, GCP),
    ("Google Cloud europe-west8", "Google Cloud", 45.46, 9.19, "IT", "Milan", C, OP, HY, None, 2022, GCP),
    ("Google Cloud europe-west9", "Google Cloud", 48.86, 2.35, "FR", "Paris", C, OP, HY, None, 2022, GCP),
    ("Google Cloud europe-west10", "Google Cloud", 52.52, 13.4, "DE", "Berlin", C, OP, HY, None, 2023, GCP),
    ("Google Cloud europe-west12", "Google Cloud", 45.07, 7.69, "IT", "Turin", C, OP, HY, None, 2023, GCP),
    ("Google Cloud europe-southwest1", "Google Cloud", 40.42, -3.7, "ES", "Madrid", C, OP, HY, None, 2022, GCP),
    ("Google Cloud asia-east1", "Google Cloud", 24.08, 120.54, "TW", "Changhua County", C, OP, HY, None, 2013, GCP),
    ("Google Cloud asia-east2", "Google Cloud", 22.32, 114.17, "HK", "Hong Kong", C, OP, HY, None, 2018, GCP),
    ("Google Cloud asia-northeast1", "Google Cloud", 35.68, 139.69, "JP", "Tokyo", C, OP, HY, None, 2016, GCP),
    ("Google Cloud asia-northeast2", "Google Cloud", 34.69, 135.5, "JP", "Osaka", C, OP, HY, None, 2019, GCP),
    ("Google Cloud asia-northeast3", "Google Cloud", 37.57, 126.98, "KR", "Seoul", C, OP, HY, None, 2020, GCP),
    ("Google Cloud asia-southeast1", "Google Cloud", 1.35, 103.82, "SG", "Singapore (Jurong West)", C, OP, HY, None, 2013, GCP),
    ("Google Cloud asia-southeast2", "Google Cloud", -6.21, 106.85, "ID", "Jakarta", C, OP, HY, None, 2020, GCP),
    ("Google Cloud asia-south1", "Google Cloud", 19.08, 72.88, "IN", "Mumbai", C, OP, HY, None, 2017, GCP),
    ("Google Cloud asia-south2", "Google Cloud", 28.61, 77.21, "IN", "Delhi", C, OP, HY, None, 2021, GCP),
    ("Google Cloud australia-southeast1", "Google Cloud", -33.87, 151.21, "AU", "Sydney", C, OP, HY, None, 2017, GCP),
    ("Google Cloud australia-southeast2", "Google Cloud", -37.81, 144.96, "AU", "Melbourne", C, OP, HY, None, 2021, GCP),
    ("Google Cloud southamerica-east1", "Google Cloud", -23.55, -46.63, "BR", "Sao Paulo", C, OP, HY, None, 2017, GCP),
    ("Google Cloud southamerica-west1", "Google Cloud", -33.45, -70.67, "CL", "Santiago", C, OP, HY, None, 2021, GCP),
    ("Google Cloud northamerica-northeast1", "Google Cloud", 45.5, -73.6, "CA", "Montreal", C, OP, HY, None, 2018, GCP),
    ("Google Cloud me-west1", "Google Cloud", 32.08, 34.78, "IL", "Tel Aviv", C, OP, HY, None, 2022, GCP),
    ("Google Cloud me-central1", "Google Cloud", 25.29, 51.53, "QA", "Doha", C, OP, HY, None, 2023, GCP),
    ("Google Cloud me-central2", "Google Cloud", 25.2, 55.27, "AE", "Dubai", C, OP, HY, None, 2023, GCP),
    ("Google Cloud africa-south1", "Google Cloud", -26.2, 28.05, "ZA", "Johannesburg", C, OP, HY, None, 2024, GCP),
    # --- Oracle / IBM / Alibaba ---
    ("Oracle Cloud Ashburn", "Oracle Cloud", 39.0, -77.5, "US", "Ashburn, Virginia", C, OP, HY, None, 2016, OCI),
    ("Oracle Cloud Phoenix", "Oracle Cloud", 33.45, -112.07, "US", "Phoenix, Arizona", C, OP, HY, None, 2016, OCI),
    ("Oracle Cloud Frankfurt", "Oracle Cloud", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, 2017, OCI),
    ("Oracle Cloud London", "Oracle Cloud", 51.5, -0.13, "GB", "London", C, OP, HY, None, 2017, OCI),
    ("Oracle Cloud Tokyo", "Oracle Cloud", 35.68, 139.69, "JP", "Tokyo", C, OP, HY, None, 2019, OCI),
    ("Oracle Cloud Sao Paulo", "Oracle Cloud", -23.55, -46.63, "BR", "Sao Paulo", C, OP, HY, None, 2019, OCI),
    ("Oracle Cloud Jeddah", "Oracle Cloud", 21.49, 39.19, "SA", "Jeddah", C, OP, HY, None, 2020, OCI),
    ("Oracle Cloud Jerusalem", "Oracle Cloud", 31.77, 35.21, "IL", "Jerusalem", C, OP, HY, None, 2021, OCI),
    ("IBM Cloud Dallas", "IBM Cloud", 32.78, -96.8, "US", "Dallas, Texas", C, OP, HY, None, None, IBM),
    ("IBM Cloud Frankfurt", "IBM Cloud", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, None, IBM),
    ("IBM Cloud Tokyo", "IBM Cloud", 35.68, 139.69, "JP", "Tokyo", C, OP, HY, None, None, IBM),
    ("IBM Cloud Sao Paulo", "IBM Cloud", -23.55, -46.63, "BR", "Sao Paulo", C, OP, HY, None, None, IBM),
    ("Alibaba Cloud Hangzhou", "Alibaba Cloud", 30.27, 120.16, "CN", "Hangzhou", C, OP, HY, None, 2011, ALI),
    ("Alibaba Cloud Beijing", "Alibaba Cloud", 39.9, 116.4, "CN", "Beijing", C, OP, HY, None, None, ALI),
    ("Alibaba Cloud Shenzhen", "Alibaba Cloud", 22.54, 114.06, "CN", "Shenzhen", C, OP, HY, None, None, ALI),
    ("Alibaba Cloud Singapore", "Alibaba Cloud", 1.35, 103.82, "SG", "Singapore", C, OP, HY, None, 2015, ALI),
    ("Alibaba Cloud Frankfurt", "Alibaba Cloud", 50.11, 8.68, "DE", "Frankfurt", C, OP, HY, None, 2016, ALI),
    ("Tencent Cloud Guangzhou", "Tencent Cloud", 23.13, 113.26, "CN", "Guangzhou", C, OP, HY, None, None, ALI),
    ("Huawei Cloud Gui'an", "Huawei Cloud", 26.43, 106.6, "CN", "Guiyang, Guizhou", C, OP, HY, None, None, ALI),
    # --- Meta campuses ---
    ("Meta Prineville Data Center", "Meta", 44.29, -120.83, "US", "Prineville, Oregon", C, OP, HY, None, 2011, META),
    ("Meta Forest City Data Center", "Meta", 35.33, -81.87, "US", "Forest City, North Carolina", C, OP, HY, None, 2012, META),
    ("Meta Altoona Data Center", "Meta", 41.65, -93.5, "US", "Altoona, Iowa", C, OP, HY, None, 2014, META),
    ("Meta Lulea Data Center", "Meta", 65.58, 22.15, "SE", "Lulea", C, OP, HY, None, 2013, META),
    ("Meta Odense Data Center", "Meta", 55.4, 10.39, "DK", "Odense", C, OP, HY, None, 2020, META),
    ("Meta Clonee Data Center", "Meta", 53.41, -6.44, "IE", "Clonee, County Meath", C, OP, HY, None, 2018, META),
    ("Meta Eagle Mountain Data Center", "Meta", 40.31, -112.0, "US", "Eagle Mountain, Utah", C, OP, HY, None, 2021, META),
    ("Meta Mesa Data Center", "Meta", 33.42, -111.83, "US", "Mesa, Arizona", C, OP, HY, None, 2021, META),
    ("Meta Hyperion (Richland Parish)", "Meta", 32.4, -91.75, "US", "Richland Parish, Louisiana", P, UC, AI, 2000, None, "https://datacenters.atmeta.com/"),
    # --- Apple / other hyperscale ---
    ("Apple Maiden Data Center", "Apple", 35.58, -81.26, "US", "Maiden, North Carolina", C, OP, HY, None, 2010, "https://www.apple.com/environment/"),
    ("Apple Reno Data Center", "Apple", 39.53, -119.81, "US", "Reno, Nevada", C, OP, HY, None, 2012, "https://www.apple.com/environment/"),
    ("Apple Viborg Data Center", "Apple", 56.45, 9.4, "DK", "Viborg", C, OP, HY, None, 2020, "https://www.apple.com/environment/"),
    ("Apple Mesa Data Center", "Apple", 33.42, -111.83, "US", "Mesa, Arizona", C, OP, HY, None, 2017, "https://www.apple.com/environment/"),
    ("xAI Colossus", "xAI", 35.15, -90.05, "US", "Memphis, Tennessee", C, OP, AI, 300, 2024, "https://x.ai/news"),
    ("OpenAI/Microsoft Stargate Abilene", "OpenAI / Oracle / Crusoe", 32.45, -99.73, "US", "Abilene, Texas", P, UC, AI, 1200, None, "https://openai.com/index/announcing-the-stargate-project/"),
    ("Switch Citadel Campus", "Switch", 39.53, -119.75, "US", "Tahoe Reno, Nevada", C, OP, CO, 650, 2017, "https://www.switch.com/"),
    ("Switch Core Campus (Las Vegas)", "Switch", 36.17, -115.14, "US", "Las Vegas, Nevada", C, OP, CO, None, 2008, "https://www.switch.com/"),
    ("Switch Pyramid Campus", "Switch", 42.96, -85.67, "US", "Grand Rapids, Michigan", C, OP, CO, None, 2017, "https://www.switch.com/"),
    ("QTS Atlanta-Metro (Suwanee)", "QTS Realty Trust", 34.05, -84.07, "US", "Suwanee, Georgia", C, OP, CO, None, 2010, "https://www.qtsdatacenters.com/"),
    ("Vantage V1 Campus Santa Clara", "Vantage Data Centers", 37.35, -121.95, "US", "Santa Clara, California", C, OP, CO, None, 2010, "https://vantage-dc.com/"),
    ("CyrusOne Carrollton", "CyrusOne", 32.95, -96.89, "US", "Carrollton, Texas", C, OP, CO, None, 2007, "https://www.cyrusone.com/"),
    ("Digital Realty Ashburn Campus", "Digital Realty", 39.0, -77.46, "US", "Ashburn, Virginia", C, OP, CO, None, 2005, "https://www.digitalrealty.com/"),
    ("Equinix DC2 (Ashburn)", "Equinix", 39.02, -77.46, "US", "Ashburn, Virginia", C, OP, CO, None, 1999, EQUINIX),
    ("Equinix FR2 (Frankfurt)", "Equinix", 50.1, 8.63, "DE", "Frankfurt", C, OP, CO, None, 2000, EQUINIX),
    ("Equinix SG1 (Singapore)", "Equinix", 1.32, 103.89, "SG", "Singapore", C, OP, CO, None, 2002, EQUINIX),
    ("Equinix LD4 (Slough)", "Equinix", 51.52, -0.62, "GB", "Slough", C, OP, CO, None, 2007, EQUINIX),
    ("Equinix TY2 (Tokyo)", "Equinix", 35.65, 139.75, "JP", "Tokyo", C, OP, CO, None, 2000, EQUINIX),
    ("NTT Fukuoka 1 / Osaka campuses", "NTT Communications", 35.68, 139.69, "JP", "Tokyo", C, OP, CO, None, None, "https://www.global.ntt/"),
    ("Iron Mountain Manassas (VA-1)", "Iron Mountain", 38.75, -77.48, "US", "Manassas, Virginia", C, OP, CO, None, 2017, "https://www.ironmountain.com/data-centers"),
    ("STACK INFRASTRUCTURE SVY01", "STACK Infrastructure", 37.42, -121.94, "US", "San Jose, California", C, OP, CO, None, None, "https://www.stackinfra.com/"),
    ("CoreSite LA1", "CoreSite", 34.05, -118.25, "US", "Los Angeles, California", C, OP, CO, None, 2001, "https://www.coresite.com/"),
    ("Colt London 3", "Colt Data Centre Services", 51.5, -0.13, "GB", "London", C, OP, CO, None, None, "https://www.colt.net/"),
    ("Global Switch London North", "Global Switch", 51.53, -0.02, "GB", "London", C, OP, CO, None, 1999, "https://www.globalswitch.com/"),
    ("Interxion PAR8 (Paris)", "Digital Realty (Interxion)", 48.87, 2.33, "FR", "Paris", C, OP, CO, None, None, "https://www.interxion.com/"),
    ("DATA4 Marcoussis Campus", "DATA4", 48.64, 2.23, "FR", "Marcoussis", C, OP, CO, None, 2006, "https://www.data4group.com/"),
    ("Aruba Global Cloud Data Center IT3", "Aruba S.p.A.", 45.48, 9.12, "IT", "Arezzo / Milan", C, OP, CO, None, 2017, "https://www.aruba.it/"),
    ("Teraco JB1 (Isando)", "Teraco", -26.14, 28.21, "ZA", "Johannesburg", C, OP, CO, None, 2009, "https://www.teraco.co.za/"),
    ("NEXTDC S1 Sydney", "NEXTDC", -33.87, 151.2, "AU", "Sydney", C, OP, CO, None, 2013, "https://www.nextdc.com/"),
    ("AirTrunk SYD1", "AirTrunk", -33.8, 151.0, "AU", "Sydney", C, OP, HY, None, 2017, "https://airtrunk.com/"),
    ("STT GDC Singapore", "ST Telemedia Global Data Centres", 1.35, 103.82, "SG", "Singapore", C, OP, CO, None, None, "https://www.sttelemediagdc.com/"),
    ("Kao Data Campus (Harlow)", "Kao Data", 51.77, 0.11, "GB", "Harlow", C, OP, CO, None, 2018, "https://kaodata.com/"),
    ("Verne Global Keflavik", "Verne Global", 63.99, -22.6, "IS", "Keflavik", C, OP, CO, None, 2012, "https://verneglobal.com/"),
    ("Green Mountain DC1 (Rjukan)", "Green Mountain", 59.88, 8.59, "NO", "Rjukan", C, OP, CO, None, 2015, "https://greenmountain.no/"),
    ("atNorth ICE01", "atNorth", 64.15, -21.95, "IS", "Reykjavik", C, OP, CO, None, 2012, "https://www.atnorth.com/"),
    ("Bulk Infrastructure N01 (Kristiansand)", "Bulk Infrastructure", 58.15, 8.0, "NO", "Kristiansand", C, OP, CO, None, 2019, "https://bulkinfrastructure.com/"),
    ("Echelon DUB10 (Clondalkin)", "Echelon Data Centres", 53.32, -6.4, "IE", "Dublin", P, UC, HY, None, None, "https://echelondc.com/"),
    ("TikTok Project Clover (Hamina)", "TikTok / ByteDance", 60.57, 27.19, "FI", "Hamina", P, UC, HY, None, None, "https://newsroom.tiktok.com/"),
    ("CoreWeave Lancaster PA", "CoreWeave", 40.04, -76.31, "US", "Lancaster, Pennsylvania", P, UC, AI, None, None, "https://www.coreweave.com/"),
    ("Crusoe Abilene AI Campus", "Crusoe", 32.45, -99.73, "US", "Abilene, Texas", C, OP, AI, None, 2024, "https://crusoe.ai/"),
    ("Marathon Digital Granbury", "Marathon Digital Holdings", 32.44, -97.79, "US", "Granbury, Texas", C, OP, CR, 300, 2023, "https://ir.mara.com/"),
    ("Riot Platforms Rockdale", "Riot Platforms", 30.65, -97.0, "US", "Rockdale, Texas", C, OP, CR, 700, 2022, "https://www.riotplatforms.com/"),
    # --- Government / HPC ---
    ("Frontier (Oak Ridge National Laboratory)", "US DOE / Oak Ridge NL", 35.93, -84.31, "US", "Oak Ridge, Tennessee", C, OP, HPC, 30, 2022, "https://www.olcf.ornl.gov/frontier/"),
    ("El Capitan (Lawrence Livermore NL)", "US DOE / LLNL", 37.69, -121.7, "US", "Livermore, California", C, OP, HPC, 35, 2024, "https://www.llnl.gov/"),
    ("Aurora (Argonne National Laboratory)", "US DOE / Argonne NL", 41.71, -87.98, "US", "Lemont, Illinois", C, OP, HPC, 60, 2023, "https://www.alcf.anl.gov/aurora"),
    ("Fugaku (RIKEN R-CCS)", "RIKEN", 34.65, 135.22, "JP", "Kobe", C, OP, HPC, 30, 2020, "https://www.r-ccs.riken.jp/en/"),
    ("LUMI (CSC Kajaani)", "EuroHPC JU / CSC", 64.22, 27.73, "FI", "Kajaani", C, OP, HPC, 8, 2022, "https://www.lumi-supercomputer.eu/"),
    ("Leonardo (CINECA Bologna)", "EuroHPC JU / CINECA", 44.49, 11.34, "IT", "Bologna", C, OP, HPC, 7, 2022, "https://leonardo-supercomputer.cineca.eu/"),
    ("MareNostrum 5 (Barcelona SC)", "EuroHPC JU / BSC", 41.39, 2.12, "ES", "Barcelona", C, OP, HPC, 4, 2023, "https://www.bsc.es/"),
    ("Jupiter (Forschungszentrum Julich)", "EuroHPC JU / FZJ", 50.9, 6.41, "DE", "Julich", C, OP, HPC, 15, 2024, "https://www.fz-juelich.de/"),
    ("TaihuLight (National SC Center Wuxi)", "NRCPC", 31.55, 120.27, "CN", "Wuxi", C, OP, HPC, 15, 2016, "https://www.nsccwx.cn/"),
    ("NSA Utah Data Center", "National Security Agency", 40.43, -111.93, "US", "Bluffdale, Utah", C, OP, GOV, 65, 2014, "https://en.wikipedia.org/wiki/Utah_Data_Center"),
    ("Bahnhof Pionen", "Bahnhof", 59.31, 18.07, "SE", "Stockholm", C, OP, CO, None, 2008, "https://www.bahnhof.net/"),
    ("CERN Data Centre (Meyrin)", "CERN", 46.23, 6.05, "CH", "Meyrin, Geneva", C, OP, HPC, 3, 1976, "https://home.cern/science/computing"),
]


def main() -> None:
    retrieved = datetime.now(timezone.utc).date().isoformat()
    records = []
    for i, (name, operator, lat, lng, country, city, tier, status, dtype, mw, year, url) in enumerate(ROWS):
        records.append(
            {
                "seed_id": f"curated-{i:04d}",
                "name": name,
                "operator": operator,
                "owner": None,
                "lat": lat,
                "lng": lng,
                "country": country,
                "city": city,
                "tier": tier,
                "status": status,
                "type": dtype,
                "power_capacity_mw": mw,
                "year_opened": year,
                "sources": [{"url": url, "retrieved": retrieved}],
            }
        )
    out = Path("data/raw/curated.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(records, ensure_ascii=False, indent=1))
    print(f"curated: {len(records)} records -> {out}")


if __name__ == "__main__":
    main()
