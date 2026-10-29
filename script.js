// جلب المنتجات وإعدادات المتجر من الذاكرة المحلية
let products = JSON.parse(localStorage.getItem('my_store_products')) || [];
let storeSettings = JSON.parse(localStorage.getItem('my_store_settings')) || {
    phone: "966500000000",
    bank: "البنك الأهلي: 1234567890 - اسم المستفيد: اسمك"
};

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    // تعبئة حقول الإعدادات بالقيم المحفوظة مسبقاً
    document.getElementById('setting-phone').value = storeSettings.phone;
    document.getElementById('setting-bank').value = storeSettings.bank;
});

// حفظ الإعدادات العامة للمتجر
function saveSettings(event) {
    event.preventDefault();
    storeSettings.phone = document.getElementById('setting-phone').value;
    storeSettings.bank = document.getElementById('setting-bank').value;
    
    localStorage.setItem('my_store_settings', JSON.stringify(storeSettings));
    alert('تم حفظ الإعدادات العامة بنجاح!');
}

// عرض المنتجات
function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">لا توجد منتجات حالياً. استخدم لوحة التحكم لإضافة منتجك الأول.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div>
                ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                <h3>${product.title}</h3>
                <p class="duration">${product.duration}</p>
                <div class="price">${product.price} ريال</div>
            </div>
            <div>
                <button class="btn btn-buy" onclick="openBuyModal(${product.id})">شراء الآن</button>
                <div class="card-actions">
                    <button class="btn btn-edit" onclick="editProduct(${product.id})">تعديل</button>
                    <button class="btn btn-delete" onclick="deleteProduct(${product.id})">حذف</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    localStorage.setItem('my_store_products', JSON.stringify(products));
}

// إظهار وإخفاء لوحة التحكم
function toggleAdminPanel() {
    const panel = document.getElementById('admin-panel');
    panel.classList.toggle('hidden');
}

// إضافة أو تعديل منتج (الصورة أصبحت اختيارية وليست إجبارية)
function handleProductSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const title = document.getElementById('prod-title').value;
    const price = document.getElementById('prod-price').value;
    const duration = document.getElementById('prod-duration').value;
    const fileInput = document.getElementById('prod-image-file');

    if (fileInput.files && fileInput.files[0]) {
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

    resetForm();
    renderProducts();
}

// تعديل منتج
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-title').value = product.title;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-duration').value = product.duration;

    document.getElementById('admin-panel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// حذف منتج
function deleteProduct(id) {
    if (confirm('هل أنت تأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id !== id);
        renderProducts();
    }
}

// إعادة ضبط النموذج
function resetForm() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
}

// فتح نافذة الشراء والتحويل
function openBuyModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('modal-product-name').textContent = `طلب: ${product.title}`;
    document.getElementById('modal-product-price').textContent = `${product.price} ريال`;
    
    // عرض بيانات البنك المحدثة من الإعدادات
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
