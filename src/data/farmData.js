export const ALL_COUNTIES = ["Mombasa","Kwale","Kilifi","Tana River","Lamu","Taita Taveta","Garissa","Wajir","Mandera","Marsabit","Isiolo","Meru","Tharaka Nithi","Embu","Kitui","Machakos","Makueni","Nyandarua","Nyeri","Kirinyaga","Murang'a","Kiambu","Turkana","West Pokot","Samburu","Trans Nzoia","Uasin Gishu","Elgeyo Marakwet","Nandi","Baringo","Laikipia","Nakuru","Narok","Kajiado","Kericho","Bomet","Kakamega","Vihiga","Bungoma","Busia","Siaya","Kisumu","Homa Bay","Migori","Kisii","Nyamira","Nairobi"];

export const ALL_PRODUCTS = [
  // ====== CEREALS ======
  { id:1, name:'White Maize', farmer:'John Kimani', price:3500, unit:'90kg bag', location:'Kitale', category:'Cereals', subCategory:'Maize', image:'🌽', rating:4.5, phone:'254712345678' },
  { id:2, name:'Yellow Maize', farmer:'Grace Njeri', price:3200, unit:'90kg bag', location:'Trans Nzoia', category:'Cereals', subCategory:'Maize', image:'🌽', rating:4.6, phone:'254722345678' },
  { id:3, name:'Green Maize', farmer:'Peter Mwangi', price:1500, unit:'1 dozen', location:'Nakuru', category:'Cereals', subCategory:'Maize', image:'🌽', rating:4.4, phone:'254732345678' },
  { id:4, name:'Wheat', farmer:'Sarah Chebet', price:4500, unit:'90kg bag', location:'Narok', category:'Cereals', subCategory:'Wheat', image:'🌾', rating:4.7, phone:'254742345678' },
  { id:5, name:'Sorghum', farmer:'David Kiprono', price:3500, unit:'90kg bag', location:'Busia', category:'Cereals', subCategory:'Sorghum', image:'🌾', rating:4.3, phone:'254752345678' },
  { id:8, name:'Brown Rice', farmer:'Mary Wanjiku', price:6000, unit:'50kg bag', location:'Mwea', category:'Cereals', subCategory:'Rice', image:'🍚', rating:4.6, phone:'254782345678' },

  // ====== LEGUMES ======
  { id:11, name:'Red Beans', farmer:'James Kiprop', price:4500, unit:'90kg bag', location:'Bungoma', category:'Legumes', subCategory:'Beans', image:'🫘', rating:4.5, phone:'254712345679' },
  { id:12, name:'Green Grams', farmer:'Mary Wanjiku', price:5000, unit:'50kg bag', location:'Machakos', category:'Legumes', subCategory:'Green Grams', image:'🫘', rating:4.6, phone:'254722345679' },
  { id:13, name:'Cowpeas', farmer:'Michael Otieno', price:4000, unit:'50kg bag', location:'Siaya', category:'Legumes', subCategory:'Cowpeas', image:'🫘', rating:4.3, phone:'254732345679' },
  { id:15, name:'Lentils', farmer:'Peter Njoroge', price:5200, unit:'25kg bag', location:'Nakuru', category:'Legumes', subCategory:'Lentils', image:'🫘', rating:4.3, phone:'254752345679' },

  // ====== TUBERS ======
  { id:19, name:'Irish Potatoes', farmer:'Mary Wanjiku', price:3000, unit:'50kg bag', location:'Nyandarua', category:'Tubers', subCategory:'Potatoes', image:'🥔', rating:4.5, phone:'254712345680' },
  { id:20, name:'Sweet Potatoes', farmer:'James Kamau', price:1500, unit:'20kg bag', location:'Kitui', category:'Tubers', subCategory:'Sweet Potatoes', image:'🍠', rating:4.3, phone:'254722345680' },

  // ====== VEGETABLES ======
  { id:27, name:'Tomatoes', farmer:'David Kiprono', price:2500, unit:'1kg crate', location:'Kirinyaga', category:'Vegetables', subCategory:'Tomatoes', image:'🍅', rating:4.8, phone:'254712345681' },
  { id:28, name:'Onions', farmer:'Ann Wambui', price:2000, unit:'5kg bag', location:'Nakuru', category:'Vegetables', subCategory:'Onions', image:'🧅', rating:4.4, phone:'254722345681' },
  { id:29, name:'Cabbages', farmer:'John Kimani', price:500, unit:'1 piece', location:'Kiambu', category:'Vegetables', subCategory:'Cabbages', image:'🥬', rating:4.3, phone:'254732345681' },
  { id:30, name:'Kales', farmer:'Sarah Chebet', price:300, unit:'1 bunch', location:'Nyeri', category:'Vegetables', subCategory:'Kales', image:'🥬', rating:4.3, phone:'254742345681' },

  // ====== FISH ======
  { id:37, name:'Fresh Tilapia', farmer:'James Otieno', price:500, unit:'1 kg', location:'Kisumu', category:'Fish', subCategory:'Fresh Fish', image:'🐟', rating:4.8, phone:'254712345690' },
  { id:38, name:'Fresh Nile Perch', farmer:'Mary Akinyi', price:800, unit:'1 kg', location:'Homa Bay', category:'Fish', subCategory:'Fresh Fish', image:'🐟', rating:4.7, phone:'254722345690' },
  { id:44, name:'Prawns', farmer:'Sarah Wanjiku', price:1500, unit:'1 kg', location:'Kilifi', category:'Fish', subCategory:'Seafood', image:'🦐', rating:4.8, phone:'254782345690' },

  // ====== LIVESTOCK - DAIRY CATTLE ======
  { id:47, name:'Fresian Cow', farmer:'Joseph Kiprono', price:85000, unit:'1 cow', location:'Eldoret', category:'Livestock', subCategory:'Dairy Cattle', image:'🐄', rating:4.9, phone:'254712345682', desc:'High milk producer, 25L/day' },
  { id:48, name:'Ayrshire Heifer', farmer:'Samuel Mbugua', price:75000, unit:'1 cow', location:'Nakuru', category:'Livestock', subCategory:'Dairy Cattle', image:'🐄', rating:4.8, phone:'254722345682', desc:'Excellent grazer, 20L/day' },
  { id:49, name:'Jersey Cow', farmer:'William Kipchoge', price:80000, unit:'1 cow', location:'Kericho', category:'Livestock', subCategory:'Dairy Cattle', image:'🐄', rating:4.9, phone:'254732345682', desc:'High butterfat milk, 18L/day' },
  { id:50, name:'Guernsey Cow', farmer:'Peter Kiprop', price:78000, unit:'1 cow', location:'Nandi', category:'Livestock', subCategory:'Dairy Cattle', image:'🐄', rating:4.7, phone:'254742345682', desc:'Golden milk, docile temperament' },
  { id:51, name:'Holstein Cow', farmer:'David Ruto', price:95000, unit:'1 cow', location:'Uasin Gishu', category:'Livestock', subCategory:'Dairy Cattle', image:'🐄', rating:4.9, phone:'254752345682', desc:'World record milk producer' },

  // ====== LIVESTOCK - BEEF CATTLE ======
  { id:52, name:'Boran Bull', farmer:'Moses Otieno', price:65000, unit:'1 bull', location:'Kajiado', category:'Livestock', subCategory:'Beef Cattle', image:'🐂', rating:4.7, phone:'254762345682', desc:'Drought resistant, excellent beef' },
  { id:53, name:'Sahiwal Bull', farmer:'Hassan Abdi', price:70000, unit:'1 bull', location:'Garissa', category:'Livestock', subCategory:'Beef Cattle', image:'🐂', rating:4.8, phone:'254772345682', desc:'Heat tolerant, good milk & beef' },
  { id:54, name:'Hereford Bull', farmer:'Peter Njoroge', price:55000, unit:'1 ox', location:'Nyandarua', category:'Livestock', subCategory:'Beef Cattle', image:'🐂', rating:4.6, phone:'254782345682', desc:'Excellent for plowing & beef' },
  { id:55, name:'Charolais Bull', farmer:'James Kipkemboi', price:90000, unit:'1 bull', location:'Laikipia', category:'Livestock', subCategory:'Beef Cattle', image:'🐂', rating:4.8, phone:'254792345682', desc:'French breed, fast growth' },

  // ====== LIVESTOCK - GOATS ======
  { id:56, name:'Dairy Goat (Toggenburg)', farmer:'David Mwangi', price:15000, unit:'1 goat', location:'Muranga', category:'Livestock', subCategory:'Goats', image:'🐐', rating:4.8, phone:'254702345682', desc:'3L milk/day, sweet temperament' },
  { id:57, name:'Meat Goat (Boer)', farmer:'Hassan Ahmed', price:12000, unit:'1 goat', location:'Garissa', category:'Livestock', subCategory:'Goats', image:'🐐', rating:4.6, phone:'254712345683', desc:'Fast growing, excellent meat' },
  { id:58, name:'Galla Goat', farmer:'Mwende Muthoka', price:8000, unit:'1 goat', location:'Kitui', category:'Livestock', subCategory:'Goats', image:'🐐', rating:4.5, phone:'254722345683', desc:'Drought resistant, dual purpose' },
  { id:59, name:'Saanen Goat', farmer:'Grace Wanjiru', price:18000, unit:'1 goat', location:'Nyeri', category:'Livestock', subCategory:'Goats', image:'🐐', rating:4.7, phone:'254732345683', desc:'Swiss breed, high milk yield' },
  { id:60, name:'Alpine Goat', farmer:'Peter Kamau', price:16000, unit:'1 goat', location:'Kiambu', category:'Livestock', subCategory:'Goats', image:'🐐', rating:4.6, phone:'254742345683', desc:'Adaptable, good for beginners' },

  // ====== LIVESTOCK - SHEEP ======
  { id:61, name:'Dorper Sheep', farmer:'Joseph Kipruto', price:14000, unit:'1 sheep', location:'Narok', category:'Livestock', subCategory:'Sheep', image:'🐑', rating:4.7, phone:'254752345683', desc:'Fast growing meat breed' },
  { id:62, name:'Merino Sheep', farmer:'Peter Mwangi', price:16000, unit:'1 sheep', location:'Laikipia', category:'Livestock', subCategory:'Sheep', image:'🐑', rating:4.8, phone:'254762345683', desc:'Premium wool producer' },
  { id:63, name:'Red Maasai Sheep', farmer:'Ole Ntimama', price:10000, unit:'1 sheep', location:'Narok', category:'Livestock', subCategory:'Sheep', image:'🐑', rating:4.5, phone:'254772345683', desc:'Disease resistant, hardy' },
  { id:64, name:'Suckling Lamb', farmer:'John Keen', price:6000, unit:'1 lamb', location:'Kajiado', category:'Livestock', subCategory:'Sheep', image:'🐑', rating:4.6, phone:'254782345683', desc:'3-4 months, tender meat' },

  // ====== LIVESTOCK - PIGS ======
  { id:65, name:'Large White Piglet', farmer:'John Mwangi', price:4500, unit:'1 piglet', location:'Nakuru', category:'Livestock', subCategory:'Pigs', image:'🐷', rating:4.5, phone:'254792345683', desc:'Fast growing, lean meat' },
  { id:66, name:'Landrace Pig', farmer:'Peter Njoroge', price:18000, unit:'1 adult', location:'Thika', category:'Livestock', subCategory:'Pigs', image:'🐷', rating:4.6, phone:'254702345683', desc:'Long body, excellent bacon' },
  { id:67, name:'Hampshire Piglet', farmer:'David Kiplagat', price:5000, unit:'1 piglet', location:'Eldoret', category:'Livestock', subCategory:'Pigs', image:'🐷', rating:4.7, phone:'254712345684', desc:'Black with white belt, muscular' },

  // ====== LIVESTOCK - RABBITS ======
  { id:69, name:'New Zealand White', farmer:'James Kamau', price:2000, unit:'1 rabbit', location:'Kiambu', category:'Livestock', subCategory:'Rabbits', image:'🐰', rating:4.7, phone:'254732345684', desc:'Meat breed, 10+ kits/litter' },
  { id:70, name:'California Rabbit', farmer:'Grace Muthoni', price:2500, unit:'1 rabbit', location:'Nyeri', category:'Livestock', subCategory:'Rabbits', image:'🐰', rating:4.6, phone:'254742345684', desc:'White with dark points, docile' },

  // ====== LIVESTOCK - CAMELS ======
  { id:73, name:'Somali Camel', farmer:'Ali Hassan', price:120000, unit:'1 camel', location:'Marsabit', category:'Livestock', subCategory:'Camels', image:'🐪', rating:4.8, phone:'254772345684', desc:'Excellent milk, 15L/day' },
  { id:74, name:'Rendille Camel', farmer:'Abdi Mohamed', price:100000, unit:'1 camel', location:'Wajir', category:'Livestock', subCategory:'Camels', image:'🐪', rating:4.7, phone:'254782345684', desc:'Pack animal, drought resistant' },

  // ====== POULTRY - CHICKEN ======
  { id:80, name:'Kienyeji Chicken', farmer:'Ruth Wanjiku', price:1200, unit:'1 bird', location:'Kiambu', category:'Poultry', subCategory:'Chicken', image:'🐔', rating:4.9, phone:'254712345685', desc:'Free range, tasty meat & eggs' },
  { id:81, name:'Broiler Chicken', farmer:'James Mwangi', price:800, unit:'1 bird', location:'Thika', category:'Poultry', subCategory:'Chicken', image:'🐔', rating:4.8, phone:'254722345685', desc:'Ready in 6 weeks' },
  { id:82, name:'Improved Kienyeji', farmer:'Grace Wambui', price:1500, unit:'1 bird', location:'Muranga', category:'Poultry', subCategory:'Chicken', image:'🐔', rating:4.7, phone:'254732345685', desc:'Faster growth, still tasty' },
  { id:83, name:'Kuroiler Chicken', farmer:'Peter Kimani', price:1000, unit:'1 bird', location:'Nakuru', category:'Poultry', subCategory:'Chicken', image:'🐔', rating:4.8, phone:'254742345685', desc:'Dual purpose, eggs & meat' },

  // ====== POULTRY - EGGS & CHICKS ======
  { id:85, name:'Fertile Kienyeji Eggs', farmer:'Grace Wambui', price:150, unit:'1 tray', location:'Muranga', category:'Poultry', subCategory:'Eggs', image:'🥚', rating:4.7, phone:'254752345685', desc:'High hatch rate' },
  { id:86, name:'Day Old Broiler Chicks', farmer:'Peter Kimani', price:120, unit:'1 chick', location:'Nakuru', category:'Poultry', subCategory:'Chicks', image:'🐣', rating:4.8, phone:'254762345685', desc:'Vaccinated, healthy' },
  { id:87, name:'Day Old Kienyeji Chicks', farmer:'Ruth Wanjiku', price:100, unit:'1 chick', location:'Kiambu', category:'Poultry', subCategory:'Chicks', image:'🐣', rating:4.6, phone:'254772345685', desc:'Improved indigenous breed' },

  // ====== POULTRY - OTHER BIRDS ======
  { id:88, name:'Turkey (Bronze)', farmer:'Michael Kipkorir', price:3500, unit:'1 bird', location:'Eldoret', category:'Poultry', subCategory:'Turkey', image:'🦃', rating:4.7, phone:'254782345685', desc:'Large bird, festive meat' },
  { id:89, name:'Muscovy Duck', farmer:'Sarah Chebet', price:1500, unit:'1 bird', location:'Kisumu', category:'Poultry', subCategory:'Duck', image:'🦆', rating:4.6, phone:'254792345685', desc:'Quiet, good foragers' },
  { id:90, name:'Guinea Fowl', farmer:'Joseph Ndirangu', price:1800, unit:'1 bird', location:'Laikipia', category:'Poultry', subCategory:'Other', image:'🐦', rating:4.7, phone:'254702345685', desc:'Natural pest control, tasty' },
  { id:91, name:'Quail', farmer:'Ann Wambui', price:500, unit:'1 bird', location:'Nairobi', category:'Poultry', subCategory:'Other', image:'🐦', rating:4.6, phone:'254712345686', desc:'Eggs & meat delicacy' },
  { id:92, name:'Goose', farmer:'Peter Mwangi', price:2500, unit:'1 bird', location:'Nakuru', category:'Poultry', subCategory:'Other', image:'🦢', rating:4.5, phone:'254722345686', desc:'Great guard bird, tasty meat' },
];

export const CATEGORIES = ['All','Cereals','Legumes','Tubers','Vegetables','Fish','Livestock','Poultry'];

export const CHAT_FARMERS = [
  { id:1, name:'John Kimani', product:'Fresh Maize', image:'🌽', location:'Kitale', phone:'254712345678' },
  { id:2, name:'Ruth Wanjiku', product:'Kienyeji Chicken', image:'🐔', location:'Kiambu', phone:'254722345678' },
  { id:3, name:'James Otieno', product:'Fresh Tilapia', image:'🐟', location:'Kisumu', phone:'254732345678' },
  { id:4, name:'Joseph Kiprono', product:'Fresian Cow', image:'🐄', location:'Eldoret', phone:'254742345678' },
  { id:5, name:'Mary Wanjiku', product:'Irish Potatoes', image:'🥔', location:'Nyandarua', phone:'254752345678' },
];

export const RIDERS = [
  { id:1, name:'James Mwangi', vehicle:'Motorcycle', rating:4.8, price:300 },
  { id:2, name:'Sarah Akello', vehicle:'Pickup', rating:4.9, price:800 },
];
