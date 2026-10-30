// استيراد مكتبات Firebase المطلوبة
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsFromFirebase();
    
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

// جلب المنتجات من قاعدة بيانات سحابة Firebase
async function loadProductsFromFirebase() {
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        products = [];
        querySnapshot.forEach((documentSnapshot) => {
            products.push({ id: documentSnapshot.id, ...documentSnapshot.data() });
        });
        renderProducts();
    } catch (e) {
        console.error("خطأ أثناء جلب المنتجات من السحابة: ", e);
    }
}

// عرض المنتجات في لوحة التحكم والمتجر العام
function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">لا توجد منتجات حالياً في السحابة.</p>';
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
                    <p class="duration">${product.duration}</p>
                    <div class="price">${product.price} ريال</div>
                </div>
                <div>
                    <div class="card-actions">
                        <button class="btn btn-edit" onclick="editProduct('${product.id}')">تعديل</button>
                        <button class="btn btn-delete" onclick="deleteProduct('${product.id}')">حذف</button>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div>
                    ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                    <h3>${product.title}</h3>
                    <p class="duration">${product.duration}</p>
                    <div class="price">${product.price} ريال</div>
                </div>
                <div>
                    <button class="btn btn-buy" onclick="openBuyModal('${product.id}')">شراء الآن</button>
                </div>
            `;
        }
        grid.appendChild(card);
    });
}

// إضافة أو تعديل منتج بسرعة فائقة
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
    // 1. تفريغ الحقول وإظهار المنتج في القائمة فوراً (بسرعة البرق دون انتظار)
    const tempId = id || 'temp_' + Date.now();
    const newProductObj = { id: tempId, title, price, duration, image };

    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) products[index] = newProductObj;
    } else {
        products.unshift(newProductObj); // يظهر في أعلى القائمة فوراً
    }
    
    renderProducts(); // تحديث الشاشة محلياً ولحظياً
    resetForm();     // تفريغ الخانات فوراً

    try {
        // 2. إرسال البيانات للسحابة في الخلفية بصمت
        if (id) {
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
        
        // مزامنة صامتة لجلب الأيدي الحقيقي من السحابة
        loadProductsFromFirebase();
    } catch (e) {
        console.error("خطأ أثناء الحفظ في السحابة: ", e);
        alert('حدث خطأ في الاتصال بالشبكة، يرجى التحقق من الإنترنت.');
        loadProductsFromFirebase(); // استعادة القائمة الصحيحة في حال وجود خطأ
    }
}

// تعديل منتج
function editProduct(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-title').value = product.title;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-duration').value = product.duration;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// حذف منتج من سحابة Firebase بسرعة لحظية
window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج من السحابة؟')) {
        // الحذف المحلي الفوري للاستجابة السريعة
        products = products.filter(p => p.id != id);
        renderProducts();
        resetForm();

        try {
            await deleteDoc(doc(db, "products", String(id)));
        } catch (e) {
            console.error("خطأ أثناء الحذف: ", e);
            loadProductsFromFirebase();
        }
    }
}

// إعادة ضبط وتفريغ النموذج
window.resetForm = function() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    const prodId = document.getElementById('prod-id');
    if (prodId) prodId.value = '';
}

// فتح نافذة الشراء والتحويل
window.openBuyModal = function(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    document.getElementById('modal-product-name').textContent = `طلب: ${product.title}`;
    document.getElementById('modal-product-price').textContent = `${product.price} ريال`;
    document.getElementById('modal-bank-text').textContent = storeSettings.bank;

    const message = encodeURIComponent(`مرحباً، أريد شراء: ${product.title}\nالمبلغ: ${product.price} ريال\nمرفق إيصال التحويل:`);
    const whatsappUrl = `https://wa.me/${storeSettings.phone}?text=${message}`;
    
    document.getElementById('whatsapp-link').href = whatsappUrl;
    document.getElementById('buy-modal').classList.remove('hidden');
}

// إغلاق النافذة المنبثقة
window.closeModal = function() {
    document.getElementById('buy-modal').classList.add('hidden');
}

// ربط الدوال بالنافذة العامة لضمان عمل الأزرار بشكل سليم في HTML
window.handleProductSubmit = handleProductSubmit;
window.saveSettings = saveSettings;
window.editProduct = editProduct;
window.resetForm = resetForm;
