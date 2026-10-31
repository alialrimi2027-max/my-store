const firebaseConfig = {
  apiKey: "AIzaSyDBz4TYLVi2cHusS3a9A2Y_glg9YB3ViqU",
  authDomain: "my-store-ed4c9.firebaseapp.com",
  projectId: "my-store-ed4c9",
  storageBucket: "my-store-ed4c9.firebasestorage.app",
  messagingSenderId: "38264665893",
  appId: "1:38264665893:web:02239c88c4586d9e750ccc"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

let products = [];
let currentCategory = 'all';
let currentSort = 'newest';
let searchQuery = '';

let storeSettings = JSON.parse(localStorage.getItem('store_settings')) || {
    phone: "966500000000",
    bank: "البنك الأهلي: 1234567890 - اسم المستفيد: اسمك",
    marquee: "⚡ أهلاً بكم في أثير ستور | أفضل الخدمات والمنتجات الرقمية بأسعار منافسة وسرعة في التنفيذ 🚀"
};

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('setting-phone');
    const bankInput = document.getElementById('setting-bank');
    const marqueeInput = document.getElementById('setting-marquee');
    
    if (phoneInput && bankInput && marqueeInput) {
        phoneInput.value = storeSettings.phone;
        bankInput.value = storeSettings.bank;
        marqueeInput.value = storeSettings.marquee;
    }

    const marqueeEl = document.getElementById('marquee-text');
    if (marqueeEl) {
        marqueeEl.textContent = storeSettings.marquee;
    }

    const cachedProducts = localStorage.getItem('cached_products');
    if (cachedProducts) {
        try {
            products = JSON.parse(cachedProducts);
            renderStore();
        } catch (e) {
            console.error("خطأ في الذاكرة المؤقتة:", e);
        }
    }

    if (db) {
        loadProductsFromFirebase();
    }

    // فتح الرابط وتحديد المنتج تلقائياً عند الدخول من رابط المشاركة
    const urlParams = new URLSearchParams(window.location.search);
    const targetProductId = urlParams.get('product');
    if (targetProductId) {
        setTimeout(() => {
            const product = products.find(p => p.id == targetProductId);
            if (product) {
                searchQuery = product.title.toLowerCase();
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = product.title;
                renderProducts();
            }
        }, 800);
    }
});

window.saveSettings = function(event) {
    event.preventDefault();
    const phoneEl = document.getElementById('setting-phone');
    const bankEl = document.getElementById('setting-bank');
    const marqueeEl = document.getElementById('setting-marquee');
    
    if (phoneEl && bankEl && marqueeEl) {
        storeSettings.phone = phoneEl.value;
        storeSettings.bank = bankEl.value;
        storeSettings.marquee = marqueeEl.value;
        localStorage.setItem('store_settings', JSON.stringify(storeSettings));
        alert('تم حفظ إعدادات المتجر وشريط الإعلانات بنجاح!');
    }
}

function loadProductsFromFirebase() {
    try {
        db.collection("products").onSnapshot((querySnapshot) => {
            const freshProducts = [];
            querySnapshot.forEach((doc) => {
                freshProducts.push({ id: doc.id, ...doc.data() });
            });
            
            if (freshProducts.length > 0) {
                products = freshProducts;
                localStorage.setItem('cached_products', JSON.stringify(products));
                renderStore();
            }
        }, (error) => {
            console.error("خطأ في المراقبة الحية: ", error);
        });
    } catch (e) {
        console.error("خطأ في الاتصال: ", e);
    }
}

function renderStore() {
    renderCategoryButtons();
    renderProducts();
}

function renderCategoryButtons() {
    const nav = document.getElementById('categoriesNav');
    if (!nav) return;

    const categories = [...new Set(products.map(p => p.category ? p.category.trim() : ''))]
                       .filter(cat => cat !== '' && cat !== 'عام');
    
    let html = `<button class="nav-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all')">الكل</button>`;
    
    categories.forEach(cat => {
        html += `<button class="nav-btn ${currentCategory === cat ? 'active' : ''}" onclick="filterCategory('${cat}')">${cat}</button>`;
    });

    nav.innerHTML = html;
}

window.filterCategory = function(cat) {
    currentCategory = cat;
    const titleEl = document.getElementById('currentCategoryTitle');
    if (titleEl) {
        titleEl.innerText = cat === 'all' ? 'منتجاتنا والخدمات المتاحة' : `قسم ${cat}`;
    }
    renderStore();
}

window.sortProducts = function(sortType) {
    currentSort = sortType;
    renderProducts();
}

window.handleSearch = function(query) {
    searchQuery = query.trim().toLowerCase();
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const isAdminPage = window.location.pathname.includes('admin.html');
    let displayedProducts = isAdminPage ? products : (currentCategory === 'all' ? products : products.filter(p => (p.category ? p.category.trim() : 'عام') === currentCategory));

    if (searchQuery) {
        displayedProducts = displayedProducts.filter(p => p.title.toLowerCase().includes(searchQuery) || (p.duration && p.duration.toLowerCase().includes(searchQuery)));
    }

    displayedProducts.sort((a, b) => {
        if (currentSort === 'price-low') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
        if (currentSort === 'price-high') return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    if (displayedProducts.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8;">لا توجد منتجات مطابقة للبحث أو القسم.</p>';
        return;
    }

    displayedProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        
        let dateString = '';
        if (product.createdAt) {
            const d = new Date(product.createdAt);
            dateString = `<p style="font-size: 0.7rem; color: #64748b; margin-top: 4px; margin-bottom: 4px;">📅 ${d.toLocaleDateString('ar-SA')} - ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>`;
        }
        
        if (isAdminPage) {
            card.innerHTML = `
                <div>
                    ${product.image ? `<img src="${product.image}" alt="${product.title}">` : ''}
                    <h3>${product.title}</h3>
                    <p style="color: #38bdf8; font-size: 0.85rem; margin-bottom: 3px;">القسم: ${product.category || 'عام'}</p>
                    <p class="duration">${product.duration || ''}</p>
                    <div class="price">${product.price} ريال</div>
                    ${dateString}
                </div>
                <div>
                    <div class="card-actions" style="display: flex; gap: 8px; margin-top: 10px;">
                        <button type="button" class="btn btn-edit" onclick="editProduct('${product.id}')" style="background:#3b82f6; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">تعديل</button>
                        <button type="button" class="btn btn-delete" onclick="deleteProduct('${product.id}')" style="background:#ef4444; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">حذف</button>
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
                    ${dateString}
                </div>
                <div>
                    <button type="button" class="btn btn-buy" onclick="openBuyModal('${product.id}')" style="background:#38bdf8; color:#0f172a; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; width:100%; margin-top:10px;">شراء الآن</button>
                    <button type="button" onclick="shareProduct('${product.id}', '${product.title}', '${product.price}')" class="btn" style="background: #334155; color: #38bdf8; border: none; padding: 5px; font-size: 0.8rem; width: 100%; margin-top: 6px; cursor: pointer;">🔗 مشاركة المنتج</button>
                </div>
            `;
        }
        grid.appendChild(card);
    });
}

window.handleProductSubmit = function(event) {
    event.preventDefault();
    
    const id = document.getElementById('prod-id').value;
    const title = document.getElementById('prod-title').value;
    const price = document.getElementById('prod-price').value;
    const duration = document.getElementById('prod-duration').value;
    
    const categorySelect = document.getElementById('prod-category');
    let category = 'عام';
    if (categorySelect) {
        if (categorySelect.value === 'custom') {
            const customInput = document.getElementById('custom-category-input');
            category = customInput ? customInput.value.trim() : 'عام';
        } else {
            category = categorySelect.value.trim();
        }
    }
    
    const fileInput = document.getElementById('prod-image-file');

    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveProductData(id, title, price, duration, category, e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        let existingImage = '';
        let existingDate = Date.now();
        if (id) {
            const existingProduct = products.find(p => p.id == id);
            if (existingProduct) {
                existingImage = existingProduct.image;
                existingDate = existingProduct.createdAt || Date.now();
            }
        }
        saveProductDataWithDate(id, title, price, duration, category, existingImage, existingDate);
    }
}

function saveProductData(id, title, price, duration, category, image) {
    let existingDate = Date.now();
    if (id) {
        const existingProduct = products.find(p => p.id == id);
        if (existingProduct && existingProduct.createdAt) {
            existingDate = existingProduct.createdAt;
        }
    }
    saveProductDataWithDate(id, title, price, duration, category, image, existingDate);
}

async function saveProductDataWithDate(id, title, price, duration, category, image, createdAt) {
    const tempId = id || 'prod_' + Date.now();
    const newProductObj = { id: tempId, title, price, duration, category, image, createdAt };

    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) products[index] = newProductObj;
    } else {
        products.unshift(newProductObj);
    }
    
    localStorage.setItem('cached_products', JSON.stringify(products));
    renderStore();
    window.resetForm();

    try {
        if (db) {
            if (id && !String(id).startsWith('prod_')) {
                await db.collection("products").doc(String(id)).set({ title, price, duration, category, image, createdAt });
            } else {
                await db.collection("products").add({ title, price, duration, category, image, createdAt });
            }
        }
    } catch (e) {
        console.error("خطأ أثناء الحفظ بالسحابة: ", e);
    }
}

window.editProduct = function(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;

    document.getElementById('prod-id').value = product.id;
    document.getElementById('prod-title').value = product.title;
    document.getElementById('prod-price').value = product.price;
    document.getElementById('prod-duration').value = product.duration;
    
    const categorySelect = document.getElementById('prod-category');
    const customInput = document.getElementById('custom-category-input');
    if (categorySelect) {
        let found = false;
        for (let option of categorySelect.options) {
            if (option.value === product.category) {
                categorySelect.value = product.category;
                found = true;
                break;
            }
        }
        if (!found && product.category) {
            categorySelect.value = 'custom';
            if (customInput) {
                customInput.style.display = 'block';
                customInput.value = product.category;
                customInput.required = true;
            }
        } else {
            if (customInput) {
                customInput.style.display = 'none';
                customInput.required = false;
            }
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteProduct = async function(id) {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        products = products.filter(p => p.id != id);
        localStorage.setItem('cached_products', JSON.stringify(products));
        renderStore();
        window.resetForm();

        try {
            if (db && !String(id).startsWith('prod_')) {
                await db.collection("products").doc(String(id)).delete();
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
    const customInput = document.getElementById('custom-category-input');
    if (customInput) {
        customInput.style.display = 'none';
        customInput.required = false;
    }
}

window.openBuyModal = function(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) return;

    const nameEl = document.getElementById('modal-product-name');
    const priceEl = document.getElementById('modal-product-price');
    const bankEl = document.getElementById('modal-bank-text');
    const linkEl = document.getElementById('whatsapp-link');
    const modalEl = document.getElementById('buy-modal');

    if (nameEl) nameEl.textContent = `طلب: ${product.title}`;
    if (priceEl) priceEl.textContent = `${product.price} ريال`;
    if (bankEl) bankEl.textContent = storeSettings.bank;

    const message = encodeURIComponent(`مرحباً، أريد شراء: ${product.title}\nالمبلغ: ${product.price} ريال`);
    const whatsappUrl = `https://wa.me/${storeSettings.phone}?text=${message}`;
    
    if (linkEl) linkEl.href = whatsappUrl;
    if (modalEl) modalEl.classList.remove('hidden');
}

window.closeModal = function() {
    const modalEl = document.getElementById('buy-modal');
    if (modalEl) modalEl.classList.add('hidden');
}

window.copyBankDetails = function() {
    const bankText = document.getElementById('modal-bank-text').textContent;
    navigator.clipboard.writeText(bankText).then(() => {
        alert('تم نسخ بيانات الحساب بنجاح! يمكنك لصقها في تطبيق البنك.');
    }).catch(err => {
        console.error('فشل النسخ: ', err);
    });
}

window.shareProduct = function(productId, title, price) {
    const productUrl = `${window.location.origin}${window.location.pathname}?product=${productId}`;
    const shareText = `شاهد هذا المنتج المميز في أثير ستور:\n📦 ${title}\n💰 السعر: ${price} ريال\n🔗 الرابط المباشر:\n${productUrl}`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: shareText,
            url: productUrl,
        }).catch(err => console.log('خطأ في المشاركة', err));
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('تم نسخ تفاصيل ورابط المنتج بنجاح!');
        });
    }
}
