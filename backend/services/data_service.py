import pandas as pd
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self, csv_path="owid-covid-data.csv"):
        self.csv_path = csv_path
        self.df = None
        self.date_strings = []
        self.load_data()

    def load_data(self):
        try:
            logger.info(f"Loading CSV file from {self.csv_path}")
            self.df = pd.read_csv(self.csv_path)
            logger.info(f"Successfully loaded CSV with {len(self.df)} rows")
            logger.info(f"Initial columns: {self.df.columns.tolist()}")
            
            # Filter for sovereign states only
            sovereign_states = [
                'AFG', 'ALB', 'DZA', 'AND', 'AGO', 'ATG', 'ARG', 'ARM', 'AUS', 'AUT', 'AZE', 'BHS', 'BHR', 'BGD', 'BRB', 'BLR', 'BEL', 'BLZ', 'BEN', 'BTN', 'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI', 'KHM', 'CMR', 'CAN', 'CPV', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COM', 'COG', 'CRI', 'CIV', 'HRV', 'CUB', 'CYP', 'CZE', 'DNK', 'DJI', 'DMA', 'DOM', 'ECU', 'EGY', 'SLV', 'GNQ', 'ERI', 'EST', 'ETH', 'FJI', 'FIN', 'FRA', 'GAB', 'GMB', 'GEO', 'DEU', 'GHA', 'GRC', 'GRD', 'GTM', 'GIN', 'GNB', 'GUY', 'HTI', 'HND', 'HUN', 'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'ISR', 'ITA', 'JAM', 'JPN', 'JOR', 'KAZ', 'KEN', 'KIR', 'PRK', 'KOR', 'KWT', 'KGZ', 'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LIE', 'LTU', 'LUX', 'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MLT', 'MHL', 'MRT', 'MUS', 'MEX', 'FSM', 'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR', 'NAM', 'NRU', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'NOR', 'OMN', 'PAK', 'PLW', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT', 'QAT', 'ROU', 'RUS', 'RWA', 'KNA', 'LCA', 'VCT', 'WSM', 'SMR', 'STP', 'SAU', 'SEN', 'SRB', 'SYC', 'SLE', 'SGP', 'SVK', 'SVN', 'SLB', 'SOM', 'ZAF', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'CHE', 'SYR', 'TWN', 'TJK', 'TZA', 'THA', 'TLS', 'TGO', 'TON', 'TTO', 'TUN', 'TUR', 'TKM', 'TUV', 'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB', 'VUT', 'VAT', 'VEN', 'VNM', 'YEM', 'ZMB', 'ZWE'
            ]
            
            # First filter for sovereign states and non-null values
            self.df = self.df[
                (self.df["iso_code"].isin(sovereign_states)) &
                (self.df["location"].notna()) &
                (self.df["iso_code"].notna())
            ].copy()
            
            logger.info(f"After filtering sovereign states: {len(self.df)} rows")
            
            # Select relevant columns and clean data
            columns = [
                "location", "date", "total_cases", "total_deaths", 
                "new_cases", "new_deaths", "population", 
                "total_cases_per_million", "total_deaths_per_million",
                "iso_code"
            ]
            
            # Check if all required columns exist
            missing_columns = [col for col in columns if col not in self.df.columns]
            if missing_columns:
                logger.error(f"Missing columns in CSV: {missing_columns}")
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            self.df = self.df[columns].copy()
            
            # Clean data - convert to numeric and handle missing values
            for col in self.df.columns:
                if col not in ["location", "date", "iso_code"]:
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
                    # Fill NaN with 0 only for numeric columns
                    self.df[col] = self.df[col].fillna(0)
                    logger.info(f"Column {col} - Non-zero values: {(self.df[col] > 0).sum()}")

            # Convert date to datetime
            self.df['date'] = pd.to_datetime(self.df['date'])
            
            # Set a hard cutoff date for the data
            cutoff_date = pd.to_datetime('2023-12-31')
            self.df = self.df[self.df['date'] <= cutoff_date].copy()
            
            # Get the latest date with non-zero data (up to cutoff)
            latest_date = self.df[self.df['total_cases'] > 0]['date'].max()
            logger.info(f"Latest date with non-zero data: {latest_date}")
            
            # Update the available dates for the timeline to only include up to latest_date
            unique_dates = sorted(self.df['date'].unique())
            self.date_strings = [d.strftime("%Y-%m-%d") for d in unique_dates]
            logger.info(f"Date range: {self.date_strings[0]} to {self.date_strings[-1]}")

            # Log some basic statistics
            unique_countries = self.df['location'].nunique()
            logger.info(f"Number of unique countries: {unique_countries}")
            
            # Log all countries and their latest data
            latest_data = self.df[self.df['date'] == latest_date]
            latest_data = latest_data[latest_data['total_cases'] > 0]  # Only include countries with cases
            logger.info(f"Latest date: {latest_date}")
            logger.info(f"Countries with data: {', '.join(sorted(latest_data['location'].unique()))}")
            logger.info(f"Number of countries with data: {len(latest_data)}")
            
            # Log data completeness
            for country in sorted(latest_data['location'].unique()):
                country_data = latest_data[latest_data['location'] == country]
                logger.info(f"{country}: cases={country_data['total_cases'].iloc[0]}, deaths={country_data['total_deaths'].iloc[0]}")

        except Exception as e:
            logger.error(f"Error loading CSV: {e}")
            raise

    def get_dates(self):
        return self.date_strings

    def get_map_data(self, date):
        try:
            logger.info(f"=== GET MAP DATA START ===")
            logger.info(f"Getting map data for date: {date}")
            date_obj = pd.to_datetime(date)
            day_data = self.df[self.df['date'] == date_obj].copy()
            logger.info(f"Found {len(day_data)} rows for date {date}")
            logger.info(f"Sample of raw data:\n{day_data[['location', 'total_cases', 'total_deaths']].head()}")

            # If no data for this date, return empty result (do NOT use latest available date)
            if day_data.empty:
                logger.info(f"No data for {date}, returning empty result.")
                return {"date": date, "countries": []}

            # Filter for countries with at least 10 cases (show gray for <10)
            day_data = day_data[day_data['total_cases'] >= 10].copy()
            logger.info(f"After filtering zero cases, found {len(day_data)} countries with data")
            logger.info(f"Sample of filtered data:\n{day_data[['location', 'total_cases', 'total_deaths']].head()}")
            
            # Calculate severity based on cases per million
            max_cases_per_million = day_data['total_cases_per_million'].max()
            logger.info(f"Max cases per million: {max_cases_per_million}")
            
            if max_cases_per_million > 0:
                day_data.loc[:, 'severity'] = (day_data['total_cases_per_million'] / max_cases_per_million * 100).fillna(0)
            else:
                day_data.loc[:, 'severity'] = 0
            
            # Sort by severity for better visualization
            day_data = day_data.sort_values('severity', ascending=False)
            
            # Map country codes to match the map data
            country_code_map = {
                # North America
                'USA': '840',  # United States
                'CAN': '124',  # Canada
                'MEX': '484',  # Mexico
                
                # South America
                'ARG': '032',  # Argentina
                'BOL': '068',  # Bolivia
                'BRA': '076',  # Brazil
                'CHL': '152',  # Chile
                'COL': '170',  # Colombia
                'ECU': '218',  # Ecuador
                'GUY': '328',  # Guyana
                'PER': '604',  # Peru
                'PRY': '600',  # Paraguay
                'SUR': '740',  # Suriname
                'URY': '858',  # Uruguay
                'VEN': '862',  # Venezuela
                
                # Europe
                'ALB': '008',  # Albania
                'AND': '020',  # Andorra
                'AUT': '040',  # Austria
                'BEL': '056',  # Belgium
                'BIH': '070',  # Bosnia and Herzegovina
                'BGR': '100',  # Bulgaria
                'HRV': '191',  # Croatia
                'CZE': '203',  # Czech Republic
                'DNK': '208',  # Denmark
                'EST': '233',  # Estonia
                'FIN': '246',  # Finland
                'FRA': '250',  # France
                'DEU': '276',  # Germany
                'GRC': '300',  # Greece
                'HUN': '348',  # Hungary
                'ISL': '352',  # Iceland
                'IRL': '372',  # Ireland
                'ITA': '380',  # Italy
                'LVA': '428',  # Latvia
                'LIE': '438',  # Liechtenstein
                'LTU': '440',  # Lithuania
                'LUX': '442',  # Luxembourg
                'MLT': '470',  # Malta
                'MDA': '498',  # Moldova
                'MCO': '492',  # Monaco
                'MNE': '499',  # Montenegro
                'NLD': '528',  # Netherlands
                'MKD': '807',  # North Macedonia
                'NOR': '578',  # Norway
                'POL': '616',  # Poland
                'PRT': '620',  # Portugal
                'ROU': '642',  # Romania
                'RUS': '643',  # Russia
                'SMR': '674',  # San Marino
                'SRB': '688',  # Serbia
                'SVK': '703',  # Slovakia
                'SVN': '705',  # Slovenia
                'ESP': '724',  # Spain
                'SWE': '752',  # Sweden
                'CHE': '756',  # Switzerland
                'UKR': '804',  # Ukraine
                'GBR': '826',  # United Kingdom
                'VAT': '336',  # Vatican City
                
                # Africa
                'DZA': '012',  # Algeria
                'AGO': '024',  # Angola
                'BEN': '204',  # Benin
                'BWA': '072',  # Botswana
                'BFA': '854',  # Burkina Faso
                'BDI': '108',  # Burundi
                'CMR': '120',  # Cameroon
                'CPV': '132',  # Cape Verde
                'CAF': '140',  # Central African Republic
                'TCD': '148',  # Chad
                'COM': '174',  # Comoros
                'COG': '178',  # Congo
                'COD': '180',  # Democratic Republic of the Congo
                'DJI': '262',  # Djibouti
                'EGY': '818',  # Egypt
                'GNQ': '226',  # Equatorial Guinea
                'ERI': '232',  # Eritrea
                'ETH': '231',  # Ethiopia
                'GAB': '266',  # Gabon
                'GMB': '270',  # Gambia
                'GHA': '288',  # Ghana
                'GIN': '324',  # Guinea
                'GNB': '624',  # Guinea-Bissau
                'KEN': '404',  # Kenya
                'LSO': '426',  # Lesotho
                'LBR': '430',  # Liberia
                'LBY': '434',  # Libya
                'MDG': '450',  # Madagascar
                'MWI': '454',  # Malawi
                'MLI': '466',  # Mali
                'MRT': '478',  # Mauritania
                'MUS': '480',  # Mauritius
                'MAR': '504',  # Morocco
                'MOZ': '508',  # Mozambique
                'NAM': '516',  # Namibia
                'NER': '562',  # Niger
                'NGA': '566',  # Nigeria
                'RWA': '646',  # Rwanda
                'STP': '678',  # Sao Tome and Principe
                'SEN': '686',  # Senegal
                'SYC': '690',  # Seychelles
                'SLE': '694',  # Sierra Leone
                'SOM': '706',  # Somalia
                'ZAF': '710',  # South Africa
                'SSD': '728',  # South Sudan
                'SDN': '729',  # Sudan
                'SWZ': '748',  # Eswatini
                'TZA': '834',  # Tanzania
                'TGO': '768',  # Togo
                'TUN': '788',  # Tunisia
                'UGA': '800',  # Uganda
                'ZMB': '894',  # Zambia
                'ZWE': '716',  # Zimbabwe
                
                # Asia
                'AFG': '004',  # Afghanistan
                'ARM': '051',  # Armenia
                'AZE': '031',  # Azerbaijan
                'BHR': '048',  # Bahrain
                'BGD': '050',  # Bangladesh
                'BTN': '064',  # Bhutan
                'BRN': '096',  # Brunei
                'KHM': '116',  # Cambodia
                'CHN': '156',  # China
                'CYP': '196',  # Cyprus
                'GEO': '268',  # Georgia
                'IND': '356',  # India
                'IDN': '360',  # Indonesia
                'IRN': '364',  # Iran
                'IRQ': '368',  # Iraq
                'ISR': '376',  # Israel
                'JOR': '400',  # Jordan
                'KAZ': '398',  # Kazakhstan
                'KWT': '414',  # Kuwait
                'KGZ': '417',  # Kyrgyzstan
                'LAO': '418',  # Laos
                'LBN': '422',  # Lebanon
                'MYS': '458',  # Malaysia
                'MDV': '462',  # Maldives
                'MNG': '496',  # Mongolia
                'MMR': '104',  # Myanmar
                'NPL': '524',  # Nepal
                'OMN': '512',  # Oman
                'PAK': '586',  # Pakistan
                'PSE': '275',  # Palestine
                'PHL': '608',  # Philippines
                'QAT': '634',  # Qatar
                'SAU': '682',  # Saudi Arabia
                'SGP': '702',  # Singapore
                'LKA': '144',  # Sri Lanka
                'SYR': '760',  # Syria
                'TJK': '762',  # Tajikistan
                'THA': '764',  # Thailand
                'TLS': '626',  # Timor-Leste
                'TUR': '792',  # Turkey
                'TKM': '795',  # Turkmenistan
                'ARE': '784',  # United Arab Emirates
                'UZB': '860',  # Uzbekistan
                'VNM': '704',  # Vietnam
                'YEM': '887',  # Yemen
                
                # Oceania
                'AUS': '036',  # Australia
                'FJI': '242',  # Fiji
                'KIR': '296',  # Kiribati
                'MHL': '584',  # Marshall Islands
                'FSM': '583',  # Micronesia
                'NRU': '520',  # Nauru
                'NZL': '554',  # New Zealand
                'PLW': '585',  # Palau
                'PNG': '598',  # Papua New Guinea
                'WSM': '882',  # Samoa
                'SLB': '090',  # Solomon Islands
                'TON': '776',  # Tonga
                'TUV': '798',  # Tuvalu
                'VUT': '548'   # Vanuatu
            }
            
            # Log the countries we're returning
            logger.info(f"Returning data for {len(day_data)} countries")
            logger.info(f"Countries: {', '.join(day_data['location'].unique())}")
            
            # Log data for each country
            for _, row in day_data.iterrows():
                logger.info(f"Country data - {row['location']}: cases={row['total_cases']}, deaths={row['total_deaths']}, severity={row['severity']}")
            
            result = {
                "date": day_data['date'].iloc[0].strftime("%Y-%m-%d"),
                "countries": [
                    {
                        "country": row["location"],
                        "iso_code": country_code_map.get(row["iso_code"], row["iso_code"]),
                        "cases": int(row["total_cases"]),
                        "deaths": int(row["total_deaths"]),
                        "cases_per_million": float(row["total_cases_per_million"]),
                        "deaths_per_million": float(row["total_deaths_per_million"]),
                        "severity": float(row["severity"])
                    }
                    for _, row in day_data.iterrows()
                ]
            }
            logger.info(f"=== GET MAP DATA END ===")
            return result
        except Exception as e:
            logger.error(f"Error in get_map_data: {e}")
            raise

    def get_global_stats(self, date: Optional[str] = None) -> Dict:
        """Get global COVID-19 statistics"""
        try:
            logger.info(f"=== GET GLOBAL STATS START ===")
            if date:
                logger.info(f"Getting stats for specific date: {date}")
                # Convert date string to datetime
                date_obj = pd.to_datetime(date)
                logger.info(f"Converted date to datetime: {date_obj}")
                
                # Get data for specific date
                day_data = self.df[self.df['date'] == date_obj].copy()
                logger.info(f"Found {len(day_data)} rows for date {date}")
                
                if day_data.empty:
                    logger.info(f"No data for {date}, returning zeros.")
                    return {
                        "total_cases": 0,
                        "total_deaths": 0,
                        "total_countries": 0,
                        "date": date
                    }
                
                # Filter for countries with at least 10 cases (show gray for <10)
                day_data = day_data[day_data['total_cases'] >= 10].copy()
                logger.info(f"After filtering zero cases, found {len(day_data)} countries with data")
                logger.info(f"Countries with data: {', '.join(sorted(day_data['location'].unique()))}")
                
                # Calculate totals
                total_cases = int(day_data['total_cases'].sum())
                total_deaths = int(day_data['total_deaths'].sum())
                total_countries = len(day_data)
                
                logger.info(f"Stats for {date}:")
                logger.info(f"Total cases: {total_cases}")
                logger.info(f"Total deaths: {total_deaths}")
                logger.info(f"Countries with cases: {total_countries}")
                
                # Log data for each country
                for _, row in day_data.iterrows():
                    logger.info(f"Country data - {row['location']}: cases={row['total_cases']}, deaths={row['total_deaths']}")
            else:
                logger.info("Getting stats for latest date")
                # Get latest data
                latest_date = self.df['date'].max()
                latest_data = self.df[self.df['date'] == latest_date].copy()
                
                logger.info(f"Found {len(latest_data)} rows for latest date {latest_date}")
                
                # Filter for countries with at least 10 cases (show gray for <10)
                latest_data = latest_data[latest_data['total_cases'] >= 10].copy()
                logger.info(f"After filtering zero cases, found {len(latest_data)} countries with data")
                logger.info(f"Countries with data: {', '.join(sorted(latest_data['location'].unique()))}")
                
                total_cases = int(latest_data['total_cases'].sum())
                total_deaths = int(latest_data['total_deaths'].sum())
                total_countries = len(latest_data)
                
                logger.info(f"Latest stats (as of {latest_date}):")
                logger.info(f"Total cases: {total_cases}")
                logger.info(f"Total deaths: {total_deaths}")
                logger.info(f"Countries with cases: {total_countries}")
                
                # Log data for each country
                for _, row in latest_data.iterrows():
                    logger.info(f"Country data - {row['location']}: cases={row['total_cases']}, deaths={row['total_deaths']}")
            
            result = {
                "total_cases": total_cases,
                "total_deaths": total_deaths,
                "total_countries": total_countries,
                "date": date if date else latest_date.strftime("%Y-%m-%d")
            }
            logger.info(f"=== GET GLOBAL STATS END ===")
            return result
        except Exception as e:
            logger.error(f"Error getting global stats: {str(e)}")
            raise

    def get_country_data(self, country_name):
        try:
            country_df = self.df[self.df['location'] == country_name].copy()
            if country_df.empty:
                raise ValueError(f"Country {country_name} not found")
            
            # Get latest data
            latest = country_df.iloc[-1]
            
            # Calculate daily changes
            country_df.loc[:, 'daily_cases'] = country_df['new_cases'].fillna(0)
            country_df.loc[:, 'daily_deaths'] = country_df['new_deaths'].fillna(0)
            
            # Get last 30 days of data
            last_30_days = country_df.tail(30).copy()
            
            # Ensure we have exactly 30 days of data
            if len(last_30_days) < 30:
                # Pad with zeros if we don't have enough data
                missing_days = 30 - len(last_30_days)
                padding = pd.DataFrame({
                    'date': pd.date_range(end=last_30_days['date'].min(), periods=missing_days, freq='D'),
                    'daily_cases': 0,
                    'daily_deaths': 0
                })
                last_30_days = pd.concat([padding, last_30_days])
            
            return {
                "country": country_name,
                "latest_stats": {
                    "total_cases": int(latest['total_cases']),
                    "total_deaths": int(latest['total_deaths']),
                    "cases_per_million": float(latest['total_cases_per_million']),
                    "deaths_per_million": float(latest['total_deaths_per_million'])
                },
                "daily_data": [
                    {
                        "date": row['date'].strftime("%Y-%m-%d"),
                        "new_cases": int(row['daily_cases']),
                        "new_deaths": int(row['daily_deaths'])
                    }
                    for _, row in last_30_days.iterrows()
                ]
            }
        except Exception as e:
            logger.error(f"Error in get_country_data: {e}")
            raise

    def get_top_countries(self):
        try:
            latest_date = self.df['date'].max()
            latest_data = self.df[self.df['date'] == latest_date].copy()
            
            # Sort by total cases
            top_cases = latest_data.nlargest(10, 'total_cases')[['location', 'total_cases', 'total_deaths']]
            # Sort by total deaths
            top_deaths = latest_data.nlargest(10, 'total_deaths')[['location', 'total_cases', 'total_deaths']]
            
            # Get all countries for the dropdown
            all_countries = latest_data[['location']].sort_values('location')
            
            return {
                "by_cases": [
                    {
                        "country": row['location'],
                        "cases": int(row['total_cases']),
                        "deaths": int(row['total_deaths'])
                    }
                    for _, row in top_cases.iterrows()
                ],
                "by_deaths": [
                    {
                        "country": row['location'],
                        "cases": int(row['total_cases']),
                        "deaths": int(row['total_deaths'])
                    }
                    for _, row in top_deaths.iterrows()
                ],
                "all_countries": [
                    {"name": row['location']}
                    for _, row in all_countries.iterrows()
                ]
            }
        except Exception as e:
            logger.error(f"Error in get_top_countries: {e}")
            raise 