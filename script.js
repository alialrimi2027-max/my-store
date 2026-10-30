// استيراد مكتبات Firebase الأصلية
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

// إعدادات مشروعك السحابي على Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDBz4TYLVi2cHusS3a9A2Y_glg9YB3ViqU",
  authDomain: "my-store-ed4c9.firebaseapp.com",
  projectId: "my-store-ed4c9",
  storageBucket: "my-store-ed4c9.firebasestorage.app",
  messagingSenderId: "38264665893",
  appId: "1:38264665893:web:02239c88c4586d9e750ccc"
};

// تهيئة Firebase وربط قاعدة البيانات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let products = [];
let storeSettings = JSON.parse(localStorage.getItem('store_settings')) || {
    phone: "966500000000",
    bank: "البنك الأهلي: 1234567890 - اسم المستفيد: اسمك"
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. قراءة المنتجات المحفوظة محلياً فوراً لمنع أي اختفاء عند التحديث
    const cachedProducts = localStorage.getItem('cached_products');
    if (cachedProducts) {
        try {
            products = JSON.parse(cachedProducts);
            renderProducts();
        } catch (e) {
            console.error("خطأ في قراءة الذاكرة المؤقتة:", e);
        }
    }

    // 2. مزامنة البيانات مع سحابة Firebase في الخلفية
    loadProductsFromFirebase();
    
    const phoneInput = document.getElementById('setting-phone');
    const bankInput = document.getElementById('setting-bank');
    if (phoneInput && bankInput) {
        phoneInput.value = storeSettings.phone;
        bankInput.value = storeSettings.bank;
    }
});

// حفظ الإعدادات العامة للمتجر
function saveSettings(event) {
    event.preventDefault();
    storeSettings.phone = document.getElementById('setting-phone').value;
    storeSettings.bank = document.getElementById('setting-bank').value;
    
    localStorage.setItem('store_settings', JSON.stringify(storeSettings));
    alert('تم حفظ الإعدادات العامة بنجاح!');
}

// جلب المنتجات ومزامنتها مع Firebase
function loadProductsFromFirebase() {
    try {
        onSnapshot(collection(db, "products"), (querySnapshot) => {
            products = [];
            querySnapshot.forEach((documentSnapshot) => {
                products.push({ id: documentSnapshot.id, ...documentSnapshot.data() });
            });
            
            // حفظ النسخة المحدثة محلياً لضمان عدم اختفائها نهائياً
            localStorage.setItem('cached_products', JSON.stringify(products));
            renderProducts();
        }, (error) => {
            console.error("خطأ في المراقبة الحية للسحابة: ", error);
        });
    } catch (e) {
        console.error("خطأ أثناء إعداد مراقبة المنتجات: ", e);
    }
}

// عرض المنتجات في لوحة التحكم والمتجر العام
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">لا توجد منتجات حالياً.</p>';
        return;
    }

    const isAdminPage = window.location.pathname.includes('admin.html');

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        
        if (isAdminPage) {
            card.innerHTML = `
                <div>
                    ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                    <h3>${product.title}</h3>
                    <p class="duration">${product.duration || ''}</p>
                    <div class="price">${product.price} ريال</div>
                </div>
                <div>
                    <div class="card-actions" style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="btn btn-edit" onclick="editProduct('${product.id}')" style="background:#3b82f6; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">تعديل</button>
                        <button class="btn btn-delete" onclick="deleteProduct('${product.id}')" style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">حذف</button>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div>
                    ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                    <h3>${product.title}</h3>
                    <p class="duration">${product.duration || ''}</p>
                    <div class="price">${product.price} ريال</div>
                </div>
                <div>
                    <button class="btn btn-buy" onclick="openBuyModal('${product.id}')" style="background:#10b981; color:#fff; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; width:100%; margin-top:10px;">شراء الآن</button>
                </div>
            `;
        }
        grid.appendChild(card);
    });
}

// إضافة أو تعديل منتج
function handleProductSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const title = document.getElementById('prod-title').value;
    const price = document.getElementById('prod-price').value;
    const duration = document.getElementById('prod-duration').value;
    const fileInput = document.getElementById('prod-image-file');

    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageDataUrl = e.target.result;
            saveProductData(id, title, price, duration, imageDataUrl);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        let existingImage = '';
        if (id) {
            const existingProduct = products.find(p => p.id == id);
            if (existingProduct) existingImage = existingProduct.image;
        }
        saveProductData(id, title, price, duration, existingImage);
    }
}

async function saveProductData(id, title, price, duration, image) {
    const tempId = id || 'prod_' + Date.now();
    const newProductObj = { id: tempId, title, price, duration, image };

    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) products[index] = newProductObj;
    } else {
        products.unshift(newProductObj);
    }
    
    // الحفظ الفوري في الذاكرة المحلية لضمان عدم اختفائه أبداً عند التحديث
    localStorage.setItem('cached_products', JSON.stringify(products));
    renderProducts();
    resetForm();

    try {
        if (id && !String(id).startsWith('prod_')) {
            const productRef = doc(db, "products", String(id));
            await setDoc(productRef, { title, price, duration, image });
        } else {
            await addDoc(collection(db, "products"), {
                title,
                price,
                duration,
                image,
                createdAt: Date.now()
            });
        }
    } catch (e) {
        console.error("خطأ أثناء الحفظ في السحابة: ", e);
    }
}

function editProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-title').value = product.title;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-duration').value = product.duration;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('cached_products', JSON.stringify(products));
        renderProducts();
        resetForm();

        try {
            if (!String(id).startsWith('prod_')) {
                await deleteDoc(doc(db, "products", String(id)));
            }
        } catch (e) {
            console.error("خطأ أثناء الحذف: ", e);
        }
    }
}

window.resetForm = function() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    const prodId = document.getElementById('prod-id');
    if (prodId) prodId.value = '';
}

window.openBuyModal = function(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    document.getElementById('modal-product-name').textContent = `طلب: ${product.title}`;
    document.getElementById('modal-product-price').textContent = `${product.price} ريال`;
    document.getElementById('modal-bank-text').textContent = storeSettings.bank;

    const message = encodeURIComponent(`مرحباً، أريد شراء: ${product.title}\nالمبلغ: ${product.price} ريال`);
    const whatsappUrl = `https://wa.me/${storeSettings.phone}?text=${message}`;
    
    document.getElementById('whatsapp-link').href = whatsappUrl;
    document.getElementById('buy-modal').classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('buy-modal').classList.add('hidden');
}

// ربط الدوال بالنافذة العامة لضمان عمل الأزرار في HTML
window.handleProductSubmit = handleProductSubmit;
window.saveSettings = saveSettings;
window.editProduct = editProduct;
window.resetForm = resetForm;
