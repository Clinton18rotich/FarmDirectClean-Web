import React, { useState } from 'react';
import { ALL_COUNTIES } from '../data/farmData';

const PRODUCT_OPTIONS = {
  'Cereals': [
    { name:'White Maize', unit:'90kg bag', avgPrice:3500, image:'🌽' },
    { name:'Yellow Maize', unit:'90kg bag', avgPrice:3200, image:'🌽' },
    { name:'Green Maize', unit:'1 dozen', avgPrice:1500, image:'🌽' },
    { name:'Wheat', unit:'90kg bag', avgPrice:4500, image:'🌾' },
    { name:'Sorghum', unit:'90kg bag', avgPrice:3500, image:'🌾' },
    { name:'Finger Millet', unit:'50kg bag', avgPrice:4000, image:'🌾' },
    { name:'Pearl Millet', unit:'50kg bag', avgPrice:3800, image:'🌾' },
    { name:'Brown Rice', unit:'50kg bag', avgPrice:6000, image:'🍚' },
    { name:'Pishori Rice', unit:'25kg bag', avgPrice:8000, image:'🍚' },
    { name:'Barley', unit:'90kg bag', avgPrice:4200, image:'🌾' },
    { name:'Oats', unit:'50kg bag', avgPrice:3500, image:'🌾' },
  ],
  'Legumes': [
    { name:'Red Beans (Rosecoco)', unit:'90kg bag', avgPrice:4500, image:'🫘' },
    { name:'Green Grams (Ndengu)', unit:'50kg bag', avgPrice:5000, image:'🫘' },
    { name:'Cowpeas (Kunde)', unit:'50kg bag', avgPrice:4000, image:'🫘' },
    { name:'Chickpeas', unit:'25kg bag', avgPrice:5500, image:'🫘' },
    { name:'Lentils', unit:'25kg bag', avgPrice:5200, image:'🫘' },
    { name:'Black Beans (Njahi)', unit:'50kg bag', avgPrice:4800, image:'🫘' },
    { name:'Pigeon Peas (Mbaazi)', unit:'50kg bag', avgPrice:3500, image:'🫘' },
    { name:'Soybeans', unit:'50kg bag', avgPrice:3800, image:'🫘' },
    { name:'Groundnuts', unit:'50kg bag', avgPrice:6000, image:'🥜' },
  ],
  'Tubers & Roots': [
    { name:'Irish Potatoes', unit:'50kg bag', avgPrice:3000, image:'🥔' },
    { name:'Sweet Potatoes', unit:'20kg bag', avgPrice:1500, image:'🍠' },
    { name:'Cassava', unit:'10kg bunch', avgPrice:800, image:'🥔' },
    { name:'Arrowroots (Nduma)', unit:'1kg bunch', avgPrice:1200, image:'🥔' },
    { name:'Yams', unit:'5kg piece', avgPrice:2500, image:'🥔' },
    { name:'Taro (Gideri)', unit:'5kg bag', avgPrice:2000, image:'🥔' },
    { name:'Ginger', unit:'1kg', avgPrice:3000, image:'🫚' },
    { name:'Turmeric', unit:'1kg', avgPrice:2500, image:'🟠' },
  ],
  'Vegetables': [
    { name:'Tomatoes', unit:'1kg crate', avgPrice:2500, image:'🍅' },
    { name:'Onions (Red)', unit:'5kg bag', avgPrice:2000, image:'🧅' },
    { name:'Spring Onions', unit:'1 bunch', avgPrice:300, image:'🧅' },
    { name:'Cabbages', unit:'1 piece', avgPrice:500, image:'🥬' },
    { name:'Kales (Sukuma Wiki)', unit:'1 bunch', avgPrice:300, image:'🥬' },
    { name:'Spinach', unit:'1 bunch', avgPrice:400, image:'🥬' },
    { name:'Amaranth (Terere)', unit:'1 bunch', avgPrice:200, image:'🌿' },
    { name:'Nightshade (Managu)', unit:'1 bunch', avgPrice:250, image:'🌿' },
    { name:'Spider Plant (Saget)', unit:'1 bunch', avgPrice:200, image:'🌿' },
    { name:'Cowpea Leaves (Kunde)', unit:'1 bunch', avgPrice:150, image:'🌿' },
    { name:'Capsicum (Hoho)', unit:'1kg crate', avgPrice:1800, image:'🫑' },
    { name:'Chili (Pilipili Kali)', unit:'1kg', avgPrice:800, image:'🌶️' },
    { name:'Carrots', unit:'1kg bag', avgPrice:800, image:'🥕' },
    { name:'Broccoli', unit:'1 piece', avgPrice:1500, image:'🥦' },
    { name:'Cauliflower', unit:'1 piece', avgPrice:1200, image:'🥦' },
    { name:'Eggplant (Biringanya)', unit:'1kg bag', avgPrice:1000, image:'🍆' },
    { name:'Courgette (Zucchini)', unit:'1kg', avgPrice:800, image:'🥒' },
    { name:'Cucumber', unit:'1kg', avgPrice:500, image:'🥒' },
    { name:'Green Peas (Minji)', unit:'1kg', avgPrice:1500, image:'🫛' },
    { name:'French Beans (Mishiri)', unit:'1kg', avgPrice:1200, image:'🫛' },
    { name:'Okra', unit:'1kg', avgPrice:800, image:'🫛' },
    { name:'Pumpkin', unit:'1 piece', avgPrice:600, image:'🎃' },
    { name:'Butternut', unit:'1 piece', avgPrice:400, image:'🎃' },
  ],
  'Fruits': [
    { name:'Avocados (Hass)', unit:'90kg bag', avgPrice:4500, image:'🥑' },
    { name:'Mangoes (Apple)', unit:'Crate', avgPrice:3200, image:'🥭' },
    { name:'Bananas', unit:'Bunch', avgPrice:1500, image:'🍌' },
    { name:'Pineapples', unit:'1 piece', avgPrice:800, image:'🍍' },
    { name:'Oranges', unit:'Crate', avgPrice:2000, image:'🍊' },
    { name:'Lemons', unit:'1kg', avgPrice:500, image:'🍋' },
    { name:'Pawpaw', unit:'1 piece', avgPrice:300, image:'🍈' },
    { name:'Watermelon', unit:'1 piece', avgPrice:500, image:'🍉' },
    { name:'Passion Fruit', unit:'1kg', avgPrice:1200, image:'🍇' },
    { name:'Tree Tomato', unit:'1kg', avgPrice:800, image:'🍅' },
    { name:'Coconut', unit:'1 piece', avgPrice:200, image:'🥥' },
    { name:'Macadamia', unit:'1kg', avgPrice:3000, image:'🥜' },
  ],
  'Fish & Seafood': [
    { name:'Fresh Tilapia', unit:'1 kg', avgPrice:500, image:'🐟' },
    { name:'Fresh Nile Perch', unit:'1 kg', avgPrice:800, image:'🐟' },
    { name:'Fresh Trout', unit:'1 kg', avgPrice:1200, image:'🐟' },
    { name:'Frozen Tilapia', unit:'1 kg', avgPrice:400, image:'🐠' },
    { name:'Smoked Fish', unit:'1 kg', avgPrice:600, image:'🐡' },
    { name:'Dried Omena', unit:'1 kg', avgPrice:300, image:'🐟' },
    { name:'Fish Fingerlings', unit:'1 piece', avgPrice:20, image:'🐟' },
    { name:'Prawns', unit:'1 kg', avgPrice:1500, image:'🦐' },
    { name:'Crabs', unit:'1 kg', avgPrice:1200, image:'🦀' },
    { name:'Lobster', unit:'1 kg', avgPrice:2500, image:'🦞' },
    { name:'Squid', unit:'1 kg', avgPrice:1000, image:'🦑' },
  ],
  'Livestock': [
    { name:'Fresian Cow', unit:'1 cow', avgPrice:85000, image:'🐄', subCategory:'Dairy Cattle' },
    { name:'Ayrshire Heifer', unit:'1 cow', avgPrice:75000, image:'🐄', subCategory:'Dairy Cattle' },
    { name:'Jersey Cow', unit:'1 cow', avgPrice:80000, image:'🐄', subCategory:'Dairy Cattle' },
    { name:'Guernsey Cow', unit:'1 cow', avgPrice:78000, image:'🐄', subCategory:'Dairy Cattle' },
    { name:'Holstein Cow', unit:'1 cow', avgPrice:95000, image:'🐄', subCategory:'Dairy Cattle' },
    { name:'Boran Bull', unit:'1 bull', avgPrice:65000, image:'🐂', subCategory:'Beef Cattle' },
    { name:'Sahiwal Bull', unit:'1 bull', avgPrice:70000, image:'🐂', subCategory:'Beef Cattle' },
    { name:'Hereford Bull', unit:'1 ox', avgPrice:55000, image:'🐂', subCategory:'Beef Cattle' },
    { name:'Charolais Bull', unit:'1 bull', avgPrice:90000, image:'🐂', subCategory:'Beef Cattle' },
    { name:'Dairy Goat (Toggenburg)', unit:'1 goat', avgPrice:15000, image:'🐐', subCategory:'Goats' },
    { name:'Meat Goat (Boer)', unit:'1 goat', avgPrice:12000, image:'🐐', subCategory:'Goats' },
    { name:'Galla Goat', unit:'1 goat', avgPrice:8000, image:'🐐', subCategory:'Goats' },
    { name:'Saanen Goat', unit:'1 goat', avgPrice:18000, image:'🐐', subCategory:'Goats' },
    { name:'Alpine Goat', unit:'1 goat', avgPrice:16000, image:'🐐', subCategory:'Goats' },
    { name:'Dorper Sheep', unit:'1 sheep', avgPrice:14000, image:'🐑', subCategory:'Sheep' },
    { name:'Merino Sheep', unit:'1 sheep', avgPrice:16000, image:'🐑', subCategory:'Sheep' },
    { name:'Red Maasai Sheep', unit:'1 sheep', avgPrice:10000, image:'🐑', subCategory:'Sheep' },
    { name:'Suckling Lamb', unit:'1 lamb', avgPrice:6000, image:'🐑', subCategory:'Sheep' },
    { name:'Large White Piglet', unit:'1 piglet', avgPrice:4500, image:'🐷', subCategory:'Pigs' },
    { name:'Landrace Pig', unit:'1 adult', avgPrice:18000, image:'🐷', subCategory:'Pigs' },
    { name:'Hampshire Piglet', unit:'1 piglet', avgPrice:5000, image:'🐷', subCategory:'Pigs' },
    { name:'Duroc Pig', unit:'1 piglet', avgPrice:5500, image:'🐷', subCategory:'Pigs' },
    { name:'New Zealand White Rabbit', unit:'1 rabbit', avgPrice:2000, image:'🐰', subCategory:'Rabbits' },
    { name:'California Rabbit', unit:'1 rabbit', avgPrice:2500, image:'🐰', subCategory:'Rabbits' },
    { name:'Flemish Giant Rabbit', unit:'1 rabbit', avgPrice:3500, image:'🐰', subCategory:'Rabbits' },
    { name:'Somali Camel', unit:'1 camel', avgPrice:120000, image:'🐪', subCategory:'Camels' },
    { name:'Rendille Camel', unit:'1 camel', avgPrice:100000, image:'🐪', subCategory:'Camels' },
    { name:'Donkey', unit:'1 donkey', avgPrice:25000, image:'🫏', subCategory:'Donkeys' },
    { name:'Alpaca', unit:'1 alpaca', avgPrice:45000, image:'🦙', subCategory:'Other' },
  ],
  'Poultry': [
    { name:'Kienyeji Chicken', unit:'1 bird', avgPrice:1200, image:'🐔', subCategory:'Chicken' },
    { name:'Broiler Chicken', unit:'1 bird', avgPrice:800, image:'🐔', subCategory:'Chicken' },
    { name:'Improved Kienyeji', unit:'1 bird', avgPrice:1500, image:'🐔', subCategory:'Chicken' },
    { name:'Kuroiler Chicken', unit:'1 bird', avgPrice:1000, image:'🐔', subCategory:'Chicken' },
    { name:'Fertile Kienyeji Eggs', unit:'1 tray', avgPrice:150, image:'🥚', subCategory:'Eggs' },
    { name:'Table Eggs', unit:'1 tray', avgPrice:350, image:'🥚', subCategory:'Eggs' },
    { name:'Day Old Broiler Chicks', unit:'1 chick', avgPrice:120, image:'🐣', subCategory:'Chicks' },
    { name:'Day Old Kienyeji Chicks', unit:'1 chick', avgPrice:100, image:'🐣', subCategory:'Chicks' },
    { name:'Turkey (Bronze)', unit:'1 bird', avgPrice:3500, image:'🦃', subCategory:'Turkey' },
    { name:'Muscovy Duck', unit:'1 bird', avgPrice:1500, image:'🦆', subCategory:'Duck' },
    { name:'Guinea Fowl', unit:'1 bird', avgPrice:1800, image:'🐦', subCategory:'Other' },
    { name:'Quail', unit:'1 bird', avgPrice:500, image:'🐦', subCategory:'Other' },
    { name:'Goose', unit:'1 bird', avgPrice:2500, image:'🦢', subCategory:'Other' },
    { name:'Pigeon', unit:'1 pair', avgPrice:800, image:'🕊️', subCategory:'Other' },
    { name:'Ostrich', unit:'1 bird', avgPrice:50000, image:'🐧', subCategory:'Other' },
  ],
};

const ALL_CATEGORIES = [...Object.keys(PRODUCT_OPTIONS), '➕ Custom'];

const UNIT_OPTIONS = ['kg','90kg bag','50kg bag','25kg bag','20kg bag','10kg bag','5kg bag','1kg bag','Crate','Bunch','Piece','Tray','Dozen','Litre','Each','1 cow','1 goat','1 sheep','1 pig','1 bird','1 rabbit','1 camel','1 donkey','Custom...'];

const customIcons = ['📦','🌾','🥬','🍎','🐄','🐔','🐟','🥚','🫘','🥔','🧅','🍅','🥑','🌽','🍚','🦃','🐑','🐐','🐷','🐰'];

export default function FarmerRegister({ onClose, onRegister }) {
  const [step, setStep] = useState(1);
  const [farmer, setFarmer] = useState({ fullName: '', phone: '+254', county: '', location: '', deliveryAvailable: false, deliveryFee: '', acceptsMpesa: true, additionalInfo: '' });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Cereals');
  const [customProduct, setCustomProduct] = useState({ name: '', category: 'Cereals', unit: 'kg', price: '', quantity: '', description: '', image: '📦' });

  const toggleProduct = (product) => {
    const exists = selectedProducts.find(p => p.name === product.name);
    if (exists) {
      setSelectedProducts(selectedProducts.filter(p => p.name !== product.name));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, price: product.avgPrice, quantity: product.unit, customUnit: false, customQuantity: '', notes: '' }]);
    }
  };

  const updateProductField = (name, field, value) => {
    setSelectedProducts(selectedProducts.map(p => p.name === name ? {...p, [field]: value} : p));
  };

  const addCustomProduct = () => {
    if (!customProduct.name || !customProduct.price) return;
    setSelectedProducts([...selectedProducts, {
      name: customProduct.name, unit: customProduct.unit, avgPrice: parseInt(customProduct.price),
      price: parseInt(customProduct.price), image: customProduct.image, category: customProduct.category,
      isCustom: true, description: customProduct.description, quantity: customProduct.quantity || customProduct.unit,
      customUnit: false, notes: ''
    }]);
    setCustomProduct({ name: '', category: 'Cereals', unit: 'kg', price: '', quantity: '', description: '', image: '📦' });
  };

  const handleSubmit = () => {
    const registration = { farmer, products: selectedProducts, registeredAt: new Date().toISOString() };
    localStorage.setItem('farmerRegistration', JSON.stringify(registration));
    onRegister && onRegister(registration);
    onClose();
  };

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'20px 20px 0 0',padding:20,maxWidth:450,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{margin:0,color:'#2E7D32'}}>👨‍🌾 Register as Farmer</h2>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer'}}>✕</button>
        </div>

        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {[1,2,3].map(s => <div key={s} style={{flex:1,height:4,borderRadius:2,background:s <= step ? '#4CAF50' : '#E0E0E0'}} />)}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h4 style={{marginBottom:12}}>📋 Your Details</h4>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>Full Name *</label><input value={farmer.fullName} onChange={e => setFarmer({...farmer, fullName: e.target.value})} placeholder="e.g. John Kimani" style={{width:'100%',padding:12,borderRadius:10,border:'2px solid #E0E0E0',fontSize:14}} /></div>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>Phone Number *</label><input value={farmer.phone} onChange={e => setFarmer({...farmer, phone: e.target.value})} placeholder="+254712345678" style={{width:'100%',padding:12,borderRadius:10,border:'2px solid #E0E0E0',fontSize:14}} /></div>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>County *</label><select value={farmer.county} onChange={e => setFarmer({...farmer, county: e.target.value})} style={{width:'100%',padding:12,borderRadius:10,border:'2px solid #E0E0E0',fontSize:14,background:'white'}}><option value="">Select County</option>{ALL_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:'bold',color:'#555',display:'block',marginBottom:4}}>Specific Location</label><input value={farmer.location} onChange={e => setFarmer({...farmer, location: e.target.value})} placeholder="e.g. Kitale Town, Milimani" style={{width:'100%',padding:12,borderRadius:10,border:'2px solid #E0E0E0',fontSize:14}} /></div>
            
            {/* Extra farmer options */}
            <div style={{background:'#FFF8E1',borderRadius:10,padding:12,marginTop:8}}>
              <p style={{fontSize:11,fontWeight:'bold',color:'#E65100',margin:'0 0 8px'}}>ℹ️ Additional Information (Optional)</p>
              <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" checked={farmer.deliveryAvailable} onChange={e => setFarmer({...farmer, deliveryAvailable: e.target.checked})} />
                <span style={{fontSize:13}}>I can deliver to buyers</span>
              </div>
              {farmer.deliveryAvailable && <input value={farmer.deliveryFee} onChange={e => setFarmer({...farmer, deliveryFee: e.target.value})} placeholder="Delivery fee range (e.g. KES 200-500)" style={{width:'100%',padding:8,borderRadius:8,border:'1px solid #ddd',fontSize:12,marginBottom:8}} />}
              <div style={{marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" checked={farmer.acceptsMpesa} onChange={e => setFarmer({...farmer, acceptsMpesa: e.target.checked})} />
                <span style={{fontSize:13}}>I accept M-Pesa payments</span>
              </div>
              <div style={{background:"#E8F5E9",borderRadius:8,padding:8,marginTop:8,border:"1px solid #A5D6A7"}}><strong style={{color:"#2E7D32",fontSize:11}}>🔒 SAFETY:</strong> <span style={{fontSize:10,color:"#2E7D32"}}>Always use FarmDirect Escrow. Never send money outside the app. We hold payment until you confirm delivery.</span></div>
              <textarea value={farmer.additionalInfo} onChange={e => setFarmer({...farmer, additionalInfo: e.target.value})} placeholder="Any other info? (e.g. 'Available on market days', 'Bulk discounts available', 'Also sell at Kitale Market')" style={{width:'100%',padding:8,borderRadius:8,border:'1px solid #ddd',fontSize:12,resize:'vertical',minHeight:50}} />
            </div>

            <button onClick={() => setStep(2)} disabled={!farmer.fullName || !farmer.phone || !farmer.county} style={{width:'100%',padding:14,background:farmer.fullName&&farmer.phone&&farmer.county?'#4CAF50':'#ccc',color:'white',border:'none',borderRadius:25,fontSize:16,fontWeight:'bold',cursor:farmer.fullName?'pointer':'not-allowed',marginTop:12}}>Next: Select Products →</button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h4 style={{marginBottom:4}}>🌾 What do you sell?</h4>
            <p style={{fontSize:12,color:'#666',marginBottom:4}}>Tap to select. Change unit, price, or add custom items.</p>
            <p style={{fontSize:11,color:'#4CAF50',marginBottom:12}}>✅ {selectedProducts.length} selected</p>
            
            <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:8,marginBottom:8,borderBottom:'1px solid #eee'}}>
              {ALL_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} style={{padding:'6px 12px',borderRadius:16,border:'none',background: selectedCategory===cat ? '#4CAF50' : cat.includes('Custom') ? '#FFF3E0' : '#F0F0F0',color: selectedCategory===cat ? 'white' : cat.includes('Custom') ? '#E65100' : '#555',fontSize:11,cursor:'pointer',whiteSpace:'nowrap',fontWeight:'bold'}}>{cat}</button>
              ))}
            </div>

            {/* Custom Product Form */}
            {selectedCategory.includes('Custom') && (
              <div style={{background:'#FFF8E1',borderRadius:12,padding:16,marginBottom:12,border:'2px solid #FFE082'}}>
                <h4 style={{marginTop:0}}>➕ Add Your Own Product</h4>
                <p style={{fontSize:11,color:'#666'}}>Don't see your product? Add anything you sell here!</p>
                <input value={customProduct.name} onChange={e => setCustomProduct({...customProduct, name: e.target.value})} placeholder="Product name *" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ddd',marginBottom:8,fontSize:13}} />
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <select value={customProduct.category} onChange={e => setCustomProduct({...customProduct, category: e.target.value})} style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ddd',fontSize:13,background:'white'}}>{Object.keys(PRODUCT_OPTIONS).map(c => <option key={c} value={c}>{c}</option>)}</select>
                  <select value={customProduct.unit} onChange={e => setCustomProduct({...customProduct, unit: e.target.value})} style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ddd',fontSize:13,background:'white'}}>{UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <input type="number" value={customProduct.price} onChange={e => setCustomProduct({...customProduct, price: e.target.value})} placeholder="Price (KES) *" style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ddd',fontSize:13}} />
                  <input value={customProduct.quantity} onChange={e => setCustomProduct({...customProduct, quantity: e.target.value})} placeholder="Qty available" style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ddd',fontSize:13}} />
                </div>
                <input value={customProduct.description} onChange={e => setCustomProduct({...customProduct, description: e.target.value})} placeholder="Description (optional)" style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ddd',marginBottom:8,fontSize:13}} />
                <p style={{fontSize:10,color:'#666',marginBottom:4}}>Choose icon:</p>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>{customIcons.map(icon => <button key={icon} onClick={() => setCustomProduct({...customProduct, image: icon})} style={{fontSize:24,padding:4,borderRadius:8,border:customProduct.image===icon?'2px solid #4CAF50':'1px solid #ddd',background:customProduct.image===icon?'#E8F5E9':'white',cursor:'pointer'}}>{icon}</button>)}</div>
                <button onClick={addCustomProduct} disabled={!customProduct.name || !customProduct.price} style={{width:'100%',padding:12,background:customProduct.name&&customProduct.price?'#FF6F00':'#ccc',color:'white',border:'none',borderRadius:25,fontWeight:'bold',cursor:customProduct.name?'pointer':'not-allowed'}}>➕ Add "{customProduct.name || 'Product'}"</button>
              </div>
            )}

            {/* Products */}
            {!selectedCategory.includes('Custom') && (
              <div style={{maxHeight:300,overflowY:'auto'}}>
                {(PRODUCT_OPTIONS[selectedCategory] || []).map(p => {
                  const isSelected = selectedProducts.find(s => s.name === p.name);
                  return (
                    <div key={p.name} onClick={() => toggleProduct(p)} style={{padding:'10px 12px',marginBottom:6,borderRadius:10,cursor:'pointer',background:isSelected?'#E8F5E9':'white',border:isSelected?'2px solid #4CAF50':'1px solid #E0E0E0'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:30}}>{p.image}</span>
                        <div style={{flex:1}}><strong style={{fontSize:13}}>{p.name}</strong>{p.subCategory && <span style={{fontSize:10,color:'#FF6F00',marginLeft:4}}>({p.subCategory})</span>}<p style={{fontSize:11,color:'#666',margin:'2px 0'}}>{p.unit} • Avg KES {p.avgPrice.toLocaleString()}</p></div>
                        <span style={{fontSize:20}}>{isSelected ? '✅' : '○'}</span>
                      </div>
                      {isSelected && (
                        <div style={{marginTop:8,padding:8,background:'white',borderRadius:8}} onClick={e => e.stopPropagation()}>
                          <div style={{display:'flex',gap:8,marginBottom:6}}>
                            <div style={{flex:1}}><label style={{fontSize:10,color:'#555',display:'block',marginBottom:2}}>Your Price (KES)</label><input type="number" value={isSelected.price} onChange={e => updateProductField(p.name, 'price', e.target.value)} style={{width:'100%',padding:6,borderRadius:6,border:'1px solid #ddd',fontSize:12}} /></div>
                            <div style={{flex:1}}><label style={{fontSize:10,color:'#555',display:'block',marginBottom:2}}>Unit <button onClick={() => updateProductField(p.name, 'customUnit', !isSelected.customUnit)} style={{background:'none',border:'none',color:'#4CAF50',fontSize:9,cursor:'pointer'}}>change</button></label>{isSelected.customUnit ? <input value={isSelected.quantity} onChange={e => updateProductField(p.name, 'quantity', e.target.value)} placeholder="e.g. 50kg bag" style={{width:'100%',padding:6,borderRadius:6,border:'1px solid #ddd',fontSize:12}} /> : <select value={isSelected.quantity} onChange={e => updateProductField(p.name, 'quantity', e.target.value)} style={{width:'100%',padding:6,borderRadius:6,border:'1px solid #ddd',fontSize:12,background:'white'}}>{UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}</select>}</div>
                          </div>
                          <input value={isSelected.notes || ''} onChange={e => updateProductField(p.name, 'notes', e.target.value)} placeholder="Notes (e.g. Organic, Fresh harvest, 50 bags available, Bulk discount)" style={{width:'100%',padding:6,borderRadius:6,border:'1px solid #ddd',fontSize:11}} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div style={{background:'#E8F5E9',borderRadius:10,padding:10,marginTop:10}}>
                <strong>Selected ({selectedProducts.length}):</strong>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>{selectedProducts.map(p => <span key={p.name} style={{background:'white',padding:'2px 8px',borderRadius:10,fontSize:10,display:'flex',alignItems:'center',gap:4}}>{p.image} {p.name} {p.isCustom && '✨'}<button onClick={() => toggleProduct(p)} style={{background:'none',border:'none',color:'#C62828',cursor:'pointer',fontSize:12}}>×</button></span>)}</div>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => setStep(1)} style={{flex:1,padding:12,background:'#F0F0F0',border:'none',borderRadius:25,fontSize:14,cursor:'pointer'}}>← Back</button>
              <button onClick={() => setStep(3)} disabled={selectedProducts.length === 0} style={{flex:1,padding:12,background:selectedProducts.length>0?'#4CAF50':'#ccc',color:'white',border:'none',borderRadius:25,fontSize:14,fontWeight:'bold',cursor:selectedProducts.length>0?'pointer':'not-allowed'}}>Review ({selectedProducts.length}) →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h4 style={{marginBottom:12}}>✅ Review Your Registration</h4>
            <div style={{background:'#F5F7FA',borderRadius:12,padding:12,marginBottom:12}}>
              <p><strong>👨‍🌾 {farmer.fullName}</strong></p><p>📱 {farmer.phone}</p><p>📍 {farmer.county}{farmer.location ? `, ${farmer.location}` : ''}</p>
              {farmer.deliveryAvailable && <p>🚚 Delivery: {farmer.deliveryFee || 'Available'}</p>}
              {farmer.acceptsMpesa && <p>💳 M-Pesa: Accepted</p>}
              {farmer.additionalInfo && <p style={{fontSize:11,color:'#666'}}>ℹ️ {farmer.additionalInfo}</p>}
            </div>
            <h4 style={{fontSize:13,marginBottom:8}}>Products ({selectedProducts.length}):</h4>
            {selectedProducts.map(p => (
              <div key={p.name} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #f0f0f0'}}>
                <span>{p.image}</span><div style={{flex:1}}><span style={{fontSize:12}}>{p.name} {p.isCustom && '✨'}</span>{p.notes && <p style={{fontSize:9,color:'#666',margin:0}}>{p.notes}</p>}</div>
                <span style={{fontSize:11,color:'#666'}}>{p.quantity || p.unit}</span><strong style={{color:'#4CAF50',fontSize:13}}>KES {parseInt(p.price).toLocaleString()}</strong>
              </div>
            ))}
            <p style={{fontSize:11,color:'#FF6F00',marginTop:12,textAlign:'center'}}>⚠️ Your listing will be reviewed within 24 hours</p>
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={() => setStep(2)} style={{flex:1,padding:12,background:'#F0F0F0',border:'none',borderRadius:25,fontSize:14,cursor:'pointer'}}>← Edit</button>
              <button onClick={handleSubmit} style={{flex:1,padding:12,background:'#4CAF50',color:'white',border:'none',borderRadius:25,fontSize:14,fontWeight:'bold',cursor:'pointer'}}>✅ Submit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
