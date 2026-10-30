// المتجر يعتمد على الذاكرة المحلية المحدثة لضمان عدم الحذف التلقائي
let products = JSON.parse(localStorage.getItem('store_products')) || [];
let storeSettings = JSON.parse(localStorage.getItem('store_settings')) || {
    phone: "966500000000",
    bank: "البنك الأهلي: 1234567890 - اسم المستفيد: اسمك"
};

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    
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
                    <p class="duration">${product.duration}</p>
                    <div class="price">${product.price} ريال</div>
                </div>
                <div>
                    <div class="card-actions">
                        <button class="btn btn-edit" onclick="editProduct(${product.id})">تعديل</button>
                        <button class="btn btn-delete" onclick="deleteProduct(${product.id})">حذف</button>
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
                    <button class="btn btn-buy" onclick="openBuyModal(${product.id})">شراء الآن</button>
                </div>
            `;
        }
        grid.appendChild(card);
    });
}

// إضافة أو تعديل منتج من لوحة التحكم بدون أي حذف تلقائي
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

function saveProductData(id, title, price, duration, image) {
    if (id) {
        const index = products.findIndex(p => p.id == id);
        products[index] = { id: Number(id), title, price, duration, image };
    } else {
        const newProduct = {
            id: Date.now(),
            title,
            price,
            duration,
            image
        };
        products.push(newProduct);
    }

    // حفظ البيانات بشكل دائم في المتصفح وجعلها ثابتة
    localStorage.setItem('store_products', JSON.stringify(products));
    
    resetForm();
    renderProducts();
    alert('تم حفظ المنتج بنجاح ولن يتم حذفه تلقائياً أبداً!');
}

// تعديل منتج
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-title').value = product.title;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-duration').value = product.duration;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// حذف منتج (فقط عند الضغط على زر حذف عمداً)
function deleteProduct(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('store_products', JSON.stringify(products));
        renderProducts();
        alert('تم حذف المنتج بنجاح!');
    }
}

// إعادة ضبط النموذج
function resetForm() {
    const form = document.getElementById('product-form');
    if (form) form.reset();
    const prodId = document.getElementById('prod-id');
    if (prodId) prodId.value = '';
}

// فتح نافذة الشراء والتحويل
function openBuyModal(productId) {
    const product = products.find(p => p.id === productId);
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
function closeModal() {
    document.getElementById('buy-modal').classList.add('hidden');
}
