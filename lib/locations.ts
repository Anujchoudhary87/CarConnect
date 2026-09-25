// Curated Indian State → District → Locality reference for the location picker.
// This is a convenience for fast, offline-cascading suggestions only — every
// selection is finally resolved through the geocode API, so anything a user
// types (even a place missing from this list) still works.

export const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman & Nicobar Islands",
  "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Jammu & Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Rajasthan: ["Ajmer","Alwar","Banswara","Baran","Barmer","Bharatpur","Bhilwara","Bikaner","Bundi","Chittorgarh","Churu","Dausa","Dholpur","Dungarpur","Hanumangarh","Jaipur","Jaisalmer","Jalore","Jhalawar","Jhunjhunu","Jodhpur","Karauli","Kota","Nagaur","Pali","Pratapgarh","Rajsamand","Sawai Madhopur","Sikar","Sirohi","Sri Ganganagar","Tonk","Udaipur"],
  Punjab: ["Amritsar","Barnala","Bathinda","Faridkot","Fatehgarh Sahib","Fazilka","Firozpur","Gurdaspur","Hoshiarpur","Jalandhar","Kapurthala","Ludhiana","Mansa","Moga","Pathankot","Patiala","Rupnagar (Ropar)","S.A.S. Nagar (Mohali)","Sangrur","Shahid Bhagat Singh Nagar","Sri Muktsar Sahib","Tarn Taran"],
  Haryana: ["Ambala","Bhiwani","Charkhi Dadri","Faridabad","Fatehabad","Gurugram","Hisar","Jhajjar","Jind","Kaithal","Karnal","Kurukshetra","Mahendragarh","Nuh","Palwal","Panchkula","Panipat","Rewari","Rohtak","Sirsa","Sonipat","Yamunanagar"],
  Delhi: ["Central Delhi","East Delhi","New Delhi","North Delhi","North East Delhi","North West Delhi","Shahdara","South Delhi","South East Delhi","South West Delhi","West Delhi"],
  "Uttar Pradesh": ["Agra","Aligarh","Ambedkar Nagar","Amethi","Amroha","Auraiya","Ayodhya","Azamgarh","Baghpat","Bahraich","Ballia","Balrampur","Banda","Barabanki","Bareilly","Basti","Bhadohi","Bijnor","Budaun","Bulandshahr","Chandauli","Chitrakoot","Deoria","Etah","Etawah","Farrukhabad","Fatehpur","Firozabad","Gautam Buddha Nagar","Ghaziabad","Ghazipur","Gonda","Gorakhpur","Hamirpur","Hapur","Hardoi","Hathras","Jalaun","Jaunpur","Jhansi","Kannauj","Kanpur Dehat","Kanpur Nagar","Kasganj","Kaushambi","Kushinagar","Lakhimpur Kheri","Lalitpur","Lucknow","Maharajganj","Mahoba","Mainpuri","Mathura","Mau","Meerut","Mirzapur","Moradabad","Muzaffarnagar","Pilibhit","Pratapgarh","Prayagraj","Rae Bareli","Rampur","Saharanpur","Sambhal","Sant Kabir Nagar","Shahjahanpur","Shamli","Shravasti","Siddharthnagar","Sitapur","Sonbhadra","Sultanpur","Unnao","Varanasi"],
  Maharashtra: ["Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana","Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna","Kolhapur","Latur","Mumbai City","Mumbai Suburban","Nagpur","Nanded","Nandurbar","Nashik","Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli","Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal"],
  Gujarat: ["Ahmedabad","Amreli","Anand","Aravalli","Banaskantha","Bharuch","Bhavnagar","Botad","Chhota Udaipur","Dahod","Dang","Devbhoomi Dwarka","Gandhinagar","Gir Somnath","Jamnagar","Junagadh","Kheda","Kutch","Mahisagar","Mehsana","Morbi","Narmada","Navsari","Panchmahal","Patan","Porbandar","Rajkot","Sabarkantha","Surat","Surendranagar","Tapi","Vadodara","Valsad"],
  Karnataka: ["Bagalkot","Ballari","Belagavi","Bengaluru Rural","Bengaluru Urban","Bidar","Chamarajanagar","Chikkaballapur","Chikkamagaluru","Chitradurga","Dakshina Kannada","Davanagere","Dharwad","Gadag","Hassan","Haveri","Kalaburagi","Kodagu","Kolar","Koppal","Mandya","Mysuru","Raichur","Ramanagara","Shivamogga","Tumakuru","Udupi","Uttara Kannada","Vijayapura","Yadgir"],
  "Tamil Nadu": ["Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kanchipuram","Kanyakumari","Karur","Krishnagiri","Madurai","Mayiladuthurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar"],
  Telangana: ["Adilabad","Bhadradri Kothagudem","Hanamkonda","Hyderabad","Jagtial","Jangaon","Jayashankar Bhupalpally","Jogulamba Gadwal","Kamareddy","Karimnagar","Khammam","Komaram Bheem","Mahabubabad","Mahabubnagar","Mancherial","Medak","Medchal-Malkajgiri","Mulugu","Nagarkurnool","Nalgonda","Narayanpet","Nirmal","Nizamabad","Peddapalli","Rajanna Sircilla","Ranga Reddy","Sangareddy","Siddipet","Suryapet","Vikarabad","Wanaparthy","Warangal","Yadadri Bhuvanagiri"],
  "Madhya Pradesh": ["Agar Malwa","Alirajpur","Anuppur","Ashoknagar","Balaghat","Barwani","Betul","Bhind","Bhopal","Burhanpur","Chhatarpur","Chhindwara","Damoh","Datia","Dewas","Dhar","Dindori","Guna","Gwalior","Harda","Hoshangabad","Indore","Jabalpur","Jhabua","Katni","Khandwa","Khargone","Mandla","Mandsaur","Morena","Narsinghpur","Neemuch","Niwari","Panna","Raisen","Rajgarh","Ratlam","Rewa","Sagar","Satna","Sehore","Seoni","Shahdol","Shajapur","Sheopur","Shivpuri","Sidhi","Singrauli","Tikamgarh","Ujjain","Umaria","Vidisha"],
  Bihar: ["Araria","Arwal","Aurangabad","Banka","Begusarai","Bhagalpur","Bhojpur","Buxar","Darbhanga","East Champaran","Gaya","Gopalganj","Jamui","Jehanabad","Kaimur","Katihar","Khagaria","Kishanganj","Lakhisarai","Madhepura","Madhubani","Munger","Muzaffarpur","Nalanda","Nawada","Pashchim Champaran","Patna","Purnia","Rohtas","Saharsa","Samastipur","Saran","Sheikhpura","Sheohar","Sitamarhi","Siwan","Supaul","Vaishali"],
  "West Bengal": ["Alipurduar","Bankura","Birbhum","Cooch Behar","Dakshin Dinajpur","Darjeeling","Hooghly","Howrah","Jalpaiguri","Jhargram","Kalimpong","Kolkata","Malda","Murshidabad","Nadia","North 24 Parganas","Paschim Bardhaman","Paschim Medinipur","Purba Bardhaman","Purba Medinipur","Purulia","South 24 Parganas","Uttar Dinajpur"],
  Odisha: ["Angul","Balangir","Balasore","Bargarh","Bhadrak","Boudh","Cuttack","Debagarh","Dhenkanal","Gajapati","Ganjam","Jagatsinghpur","Jajpur","Jharsuguda","Kalahandi","Kandhamal","Kendrapara","Kendujhar","Khordha","Koraput","Malkangiri","Mayurbhanj","Nabarangpur","Nayagarh","Nuapada","Puri","Rayagada","Sambalpur","Subarnapur","Sundargarh"],
  Jharkhand: ["Bokaro","Chatra","Deoghar","Dhanbad","Dumka","East Singhbhum","Garhwa","Giridih","Godda","Gumla","Hazaribagh","Jamtara","Khunti","Koderma","Latehar","Lohardaga","Pakur","Palamu","Ramgarh","Ranchi","Sahibganj","Seraikela Kharsawan","Simdega","West Singhbhum"],
  Chhattisgarh: ["Balod","Baloda Bazar","Balrampur","Bastar","Bemetara","Bijapur","Bilaspur","Dantewada","Dhamtari","Durg","Gariaband","Gaurela Pendra Marwahi","Janjgir Champa","Jashpur","Kanker","Kabirdham","Kondagaon","Korba","Koriya","Mahasamund","Mungeli","Narayanpur","Raigarh","Raipur","Rajnandgaon","Sukma","Surajpur","Surguja"],
  Kerala: ["Alappuzha","Ernakulam","Idukki","Kannur","Kasaragod","Kollam","Kottayam","Kozhikode","Malappuram","Palakkad","Pathanamthitta","Thiruvananthapuram","Thrissur","Wayanad"],
  Goa: ["North Goa","South Goa"],
  "Himachal Pradesh": ["Bilaspur","Chamba","Hamirpur","Kangra","Kinnaur","Kullu","Lahaul and Spiti","Mandi","Shimla","Sirmaur","Solan","Una"],
  Uttarakhand: ["Almora","Bageshwar","Chamoli","Champawat","Dehradun","Haridwar","Nainital","Pauri Garhwal","Pithoragarh","Rudraprayag","Tehri Garhwal","Udham Singh Nagar","Uttarkashi"],
  Assam: ["Baksa","Barpeta","Bongaigaon","Cachar","Chirang","Darrang","Dhemaji","Dhubri","Dibrugarh","Dima Hasao","Goalpara","Golaghat","Hailakandi","Hojai","Jorhat","Kamrup","Kamrup Metropolitan","Karbi Anglong","Karimganj","Kokrajhar","Lakhimpur","Majuli","Morigaon","Nagaon","Nalbari","Sivasagar","Sonitpur","South Salmara-Mankachar","Tinsukia","Udalguri","West Karbi Anglong"],
  "Arunachal Pradesh": ["Anjaw","Changlang","Dibang Valley","East Kameng","East Siang","Kurung Kumey","Lohit","Lower Dibang Valley","Lower Subansiri","Namsai","Pakke-Kessang","Papum Pare","Siang","Tawang","Tirap","Upper Siang","Upper Subansiri","West Kameng","West Siang"],
  Manipur: ["Bishnupur","Chandel","Churachandpur","Imphal East","Imphal West","Jiribam","Kakching","Kamjong","Kangpokpi","Noney","Pherzawl","Senapati","Tamenglong","Tengnoupal","Thoubal","Ukhrul"],
  Meghalaya: ["East Garo Hills","East Jaintia Hills","East Khasi Hills","North Garo Hills","Ri Bhoi","South Garo Hills","South West Garo Hills","South West Khasi Hills","West Garo Hills","West Jaintia Hills","West Khasi Hills"],
  Mizoram: ["Aizawl","Champhai","Hnahthial","Khawzawl","Kolasib","Lawngtlai","Lunglei","Mamit","Saiha","Saitual","Serchhip"],
  Nagaland: ["Chümoukedima","Dimapur","Kiphire","Kohima","Longleng","Mokokchung","Mon","Noklak","Peren","Phek","Tseminyü","Tuensang","Wokha","Zünheboto"],
  Sikkim: ["Gangtok","Gyalshing","Mangan","Namchi","Pakyong","Soreng"],
  Tripura: ["Dhalai","Gomati","Khowai","North Tripura","Sepahijala","South Tripura","Unakoti","West Tripura"],
  "Andaman & Nicobar Islands": ["North & Middle Andaman","South Andaman","Nicobar"],
  Chandigarh: ["Chandigarh"],
  "Dadra & Nagar Haveli and Daman & Diu": ["Dadra & Nagar Haveli","Daman","Diu"],
  "Jammu & Kashmir": ["Anantnag","Bandipora","Baramulla","Budgam","Doda","Ganderbal","Jammu","Kathua","Kishtwar","Kulgam","Kupwara","Poonch","Pulwama","Rajouri","Ramban","Reasi","Samba","Shopian","Srinagar","Udhampur"],
  Ladakh: ["Kargil","Leh"],
  Lakshadweep: ["Lakshadweep"],
  Puducherry: ["Karaikal","Mahe","Puducherry","Yanam"],
};

export const LOCALITIES_BY_REGION: Record<string, string[]> = {
  "Rajasthan|Jhunjhunu": ["Pilani","Chirawa","Jhunjhunu","Nawalgarh","Mukundgarh","Udaipurwati","Khetri","Buhana","Bissau"],
  "Punjab|Rupnagar (Ropar)": ["Ropar","Morinda","Chamkaur Sahib","Anandpur Sahib","Nangal"],
  "Rajasthan|Jaipur": ["Jaipur","Manipur","Amer","Bassi","Chomu","Phagi","Sanganer"],
  "Rajasthan|Jodhpur": ["Jodhpur","Bilara","Bhopalgarh","Osian","Phalodi","Shergarh"],
  "Rajasthan|Udaipur": ["Udaipur","Nathdwara","Rajsamand","Girwa","Salumber","Sarada"],
  "Rajasthan|Ajmer": ["Ajmer","Kekri","Kishangarh","Sarwar","Beawar"],
  "Punjab|Amritsar": ["Amritsar","Ajnala","Majitha","Rayya","Raja Sansi"],
  "Punjab|Ludhiana": ["Ludhiana","Khanna","Raikot","Jagraon","Samrala","Doraha"],
  "Haryana|Gurugram": ["Gurugram","Sohna","Pataudi","Farrukhnagar","Badshahpur"],
  "Delhi|New Delhi": ["New Delhi","Connaught Place","Chanakyapuri","Karol Bagh"],
  "Uttar Pradesh|Lucknow": ["Lucknow","Gomti Nagar","Aliganj","Hazratganj","Aminabad"],
  "Uttar Pradesh|Gautam Buddha Nagar": ["Noida","Greater Noida","Dadri","Jewar"],
  "Maharashtra|Mumbai City": ["Mumbai","Colaba","Marine Lines","Worli"],
  "Maharashtra|Mumbai Suburban": ["Andheri","Bandra","Borivali","Dadar","Juhu","Kurla"],
  "Maharashtra|Pune": ["Pune","Hinjewadi","Kothrud","Hadapsar","Viman Nagar","Wakad"],
  "Gujarat|Ahmedabad": ["Ahmedabad","Maninagar","Navrangpura","Vastrapur","Bopal"],
  "Telangana|Hyderabad": ["Hyderabad","Secunderabad","Gachibowli","Banjara Hills","Kukatpally"],
  "Karnataka|Bengaluru Urban": ["Bengaluru","Indiranagar","Koramangala","Whitefield","Marathahalli","Jayanagar"],
  "Tamil Nadu|Chennai": ["Chennai","T. Nagar","Adyar","Anna Nagar","Velachery","Mylapore"],
  "West Bengal|Kolkata": ["Kolkata","Salt Lake","Ballygunge","Barabazar"],
  "Madhya Pradesh|Bhopal": ["Bhopal","Arera Colony","MP Nagar","Kolar Road"],
  "Madhya Pradesh|Indore": ["Indore","Vijay Nagar","Palasia","Rajwada"],
};

export function searchStates(q: string): string[] {
  const n = (q ?? "").trim().toLowerCase();
  if (!n) return STATES.slice(0, 8);
  return STATES.filter((s) => s.toLowerCase().includes(n)).slice(0, 8);
}

export function districtsFor(state: string): string[] {
  return DISTRICTS_BY_STATE[state] ?? [];
}

export function searchDistricts(state: string, q: string): string[] {
  const list = districtsFor(state);
  const n = (q ?? "").trim().toLowerCase();
  if (!n) return list.slice(0, 8);
  return list.filter((d) => d.toLowerCase().includes(n)).slice(0, 8);
}

export function localitiesFor(state: string, district: string): string[] {
  const byKey = LOCALITIES_BY_REGION[`${state}|${district}`] ?? [];
  const fallback = LOCALITIES_BY_REGION[`${state}|${state}`] ?? [];
  return [...byKey, ...fallback];
}

export function searchLocalities(state: string, district: string, q: string): string[] {
  const list = localitiesFor(state, district);
  const n = (q ?? "").trim().toLowerCase();
  if (!list.length) return n ? [] : [];
  if (!n) return list.slice(0, 8);
  return list.filter((l) => l.toLowerCase().includes(n)).slice(0, 8);
}