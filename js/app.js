import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- 1. GLOBAL SETUP ---
// Centralized Supabase client initialization. All pages will use this single instance.
const SUPABASE_URL = 'https://lgrdixuixmjdsheyxsys.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncmRpeHVpeG1qZHNoZXl4c3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Nzc4NTIsImV4cCI6MjA3MjE1Mzg1Mn0.2D16XP4T2yccB038m5GWkr_HzkTnsnbc2qcyrQ22Jk4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. PAGE-SPECIFIC LOGIC ---
// This runs after the HTML document has fully loaded.
document.addEventListener('DOMContentLoaded', () => {

    // --- Index Page Logic (index.html) ---
    // Looks for an element unique to the index page, like '.hero-section'.
    if (document.querySelector('.hero-section')) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => observer.observe(el));

        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (window.scrollY > 100) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = 'none';
            }
        });
    }

    // --- Login Page Logic (login.html) ---
    // Looks for the login form by its ID.
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const messageDiv = document.getElementById('message');
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            messageDiv.innerHTML = '<p class="text-info">Logging in...</p>';
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

            if (loginError) {
                messageDiv.innerHTML = `<div class="alert alert-danger">${loginError.message}</div>`;
                return;
            }

            if (user) {
                const { data: shelter, error: shelterError } = await supabase
                    .from('shelters')
                    .select('id')
                    .eq('manager_user_id', user.id)
                    .single();

                if (shelterError && shelterError.code !== 'PGRST116') {
                    messageDiv.innerHTML = `<div class="alert alert-danger">Could not verify shelter status: ${shelterError.message}</div>`;
                    return;
                }
                
                if (shelter) {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'register-shelter.html';
                }
            }
        });
    }

    // --- Register Shelter Page Logic (register-shelter.html) ---
    const registerShelterForm = document.getElementById('register-form');
    if (registerShelterForm) {
        const messageContainer = document.getElementById('message-container');
        let currentUser = null;

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            currentUser = session.user;
        };
        
        checkSession(); // Run auth check immediately.

        registerShelterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) {
                messageContainer.innerHTML = `<div class="alert alert-danger">You are not logged in. Please log in to register a shelter.</div>`;
                return;
            }

            const animalTypes = [];
            if (document.getElementById('type-dogs').checked) animalTypes.push('dogs');
            if (document.getElementById('type-cats').checked) animalTypes.push('cats');
            if (document.getElementById('type-wildlife').checked) animalTypes.push('wildlife');

            const shelterData = {
                name: document.getElementById('shelter-name').value,
                location_city: document.getElementById('shelter-city').value,
                location_state: document.getElementById('shelter-state').value,
                description: document.getElementById('shelter-description').value,
                image_url: document.getElementById('shelter-image').value,
                animal_types: animalTypes.join(' '),
                manager_user_id: currentUser.id
            };

            const { error } = await supabase.from('shelters').insert([shelterData]);

            if (error) {
                messageContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            } else {
                messageContainer.innerHTML = `<div class="alert alert-success">Shelter registered successfully! Redirecting...</div>`;
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
            }
        });
    }

    // --- Dashboard Page Logic (dashboard.html) ---
    const dashboardContent = document.getElementById('dashboard-content');
    if (dashboardContent) {
        const loadingDiv = document.getElementById('loading');
        const shelterNameHeading = document.getElementById('shelter-name-heading');
        const needsList = document.getElementById('needs-list');
        const addNeedForm = document.getElementById('add-need-form');
        const editProfileForm = document.getElementById('edit-profile-form');
        const logoutButton = document.getElementById('logoutButton');
        let currentShelter = null;
        let currentUser = null;

        const loadNeeds = async () => {
            const { data, error } = await supabase.from('needs').select('*').eq('shelter_id', currentShelter.id).order('created_at', { ascending: false });
            needsList.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(need => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `<span>${need.title} <span class="badge bg-secondary">${need.category}</span></span><button class="btn btn-sm btn-danger delete-need-btn" data-id="${need.id}"><i class="fas fa-trash"></i></button>`;
                    needsList.appendChild(li);
                });
            } else {
                needsList.innerHTML = '<li class="list-group-item">No needs added yet.</li>';
            }
        };

        const displayShelterInfo = () => {
            shelterNameHeading.textContent = `Managing Needs for: ${currentShelter.name}`;
            document.getElementById('shelterName').value = currentShelter.name || '';
            document.getElementById('description').value = currentShelter.description || '';
            document.getElementById('websiteUrl').value = currentShelter.website_url || '';
            document.getElementById('facebookUrl').value = currentShelter.facebook_url || '';
            document.getElementById('instagramUrl').value = currentShelter.instagram_url || '';
            document.getElementById('contactPhone').value = currentShelter.contact_phone || '';
            document.getElementById('fullAddress').value = currentShelter.full_address || '';
            document.getElementById('upiId').value = currentShelter.upi_id || '';
            document.getElementById('bankAccountName').value = currentShelter.bank_account_name || '';
            document.getElementById('bankAccountNumber').value = currentShelter.bank_account_number || '';
            document.getElementById('bankIfscCode').value = currentShelter.bank_ifsc_code || '';
        };

        const checkAuthAndLoadData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                window.location.href = 'login.html';
                return;
            }
            currentUser = session.user;
            
            const { data: shelterData, error } = await supabase.from('shelters').select('*').eq('manager_user_id', currentUser.id).single();
            if (error || !shelterData) {
                window.location.href = 'register-shelter.html';
                return;
            }
            
            currentShelter = shelterData;
            displayShelterInfo();
            await loadNeeds();
            
            loadingDiv.classList.add('d-none');
            dashboardContent.classList.remove('d-none');
        };

        addNeedForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { error } = await supabase.from('needs').insert({
                title: document.getElementById('need-title').value,
                category: document.getElementById('need-category').value,
                shelter_id: currentShelter.id,
                user_id: currentUser.id
            });
            if (error) alert('Error adding need: ' + error.message);
            else {
                addNeedForm.reset();
                await loadNeeds();
            }
        });

        needsList.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-need-btn');
            if (deleteBtn) {
                const needId = deleteBtn.dataset.id;
                if (confirm('Are you sure you want to delete this need?')) {
                    const { error } = await supabase.from('needs').delete().eq('id', needId);
                    if (error) alert('Error deleting need: ' + error.message);
                    else await loadNeeds();
                }
            }
        });
        
        logoutButton.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
//             const imageFile = document.getElementById('shelterImage').files[0];
//             let imagePath = currentShelter.image_url; 
//             if (imageFile) {
//                 const newFileName = `${currentUser.id}/${Date.now()}-${imageFile.name}`;
// const { error: uploadError } = await supabase.storage.from('shelter-images').upload(newFileName, imageFile, { contentType: imageFile.type, upsert: true });                if (uploadError) {
//                     alert('Error uploading image: ' + uploadError.message);
//                     return;
//                 }
//                 imagePath = newFileName;
//             }
            const updatedData = {
                name: document.getElementById('shelterName').value,
                description: document.getElementById('description').value,
                website_url: document.getElementById('websiteUrl').value,
                facebook_url: document.getElementById('facebookUrl').value,
                instagram_url: document.getElementById('instagramUrl').value,
                contact_phone: document.getElementById('contactPhone').value,
                full_address: document.getElementById('fullAddress').value,
                upi_id: document.getElementById('upiId').value,
                bank_account_name: document.getElementById('bankAccountName').value,
                bank_account_number: document.getElementById('bankAccountNumber').value,
                bank_ifsc_code: document.getElementById('bankIfscCode').value,
                //image_url: imagePath,
            };
            const { error } = await supabase.from('shelters').update(updatedData).eq('id', currentShelter.id);
            if (error) alert('Error updating profile: ' + error.message);
            else {
                alert('Profile updated successfully!');
                currentShelter = {...currentShelter, ...updatedData};
                displayShelterInfo();
            }
        });

        checkAuthAndLoadData();
    }

    // --- Shelter Detail Page Logic (shelter.html) ---
    const shelterContentContainer = document.getElementById('shelter-content-container');
    if (shelterContentContainer) {
        const loadShelterDetails = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            let shelterId = urlParams.get('id');
            if (!shelterId) {
                shelterContentContainer.innerHTML = '<div class="container py-5 text-center"><h2 class="text-danger">Error: Shelter ID not found.</h2></div>';
                return;
            }

            const { data: shelter, error: shelterError } = await supabase.from('shelters').select('*').eq('id', shelterId).single();
            if (shelterError || !shelter) {
                shelterContentContainer.innerHTML = '<div class="container py-5 text-center"><h2 class="text-danger">Could not load shelter details.</h2></div>';
                return;
            }

            const { data: needs } = await supabase.from('needs').select('*').eq('shelter_id', shelterId).order('category');
            renderPage(shelter, needs || []);
        };

        const renderPage = (shelter, needs) => {
            const imageUrl = shelter.image_url ? `${SUPABASE_URL}/storage/v1/object/public/shelter-images/${shelter.image_url}` : 'https://placehold.co/600x400/667eea/ffffff?text=Shelter';
            const socialLinksHTML = [
                shelter.website_url ? `<li><a href="${shelter.website_url}" target="_blank" class="social-icon"><i class="fas fa-globe"></i></a></li>` : '',
                shelter.facebook_url ? `<li><a href="${shelter.facebook_url}" target="_blank" class="social-icon"><i class="fab fa-facebook-f"></i></a></li>` : '',
                shelter.instagram_url ? `<li><a href="${shelter.instagram_url}" target="_blank" class="social-icon"><i class="fab fa-instagram"></i></a></li>` : ''
            ].join('');
            const createNeedsList = (category) => {
                const filteredNeeds = needs.filter(n => n.category === category);
                return filteredNeeds.length > 0 ? filteredNeeds.map(n => `<li><i class="fas fa-paw me-2"></i> ${n.title}</li>`).join('') : '<li>No items listed currently.</li>';
            };
            const financialInfoHTML = (shelter.upi_id || shelter.bank_account_number) ? `
                <div class="col-lg-6">
                    <div class="shelter-info-card h-100">
                        <h4 class="mb-3"><i class="fas fa-rupee-sign me-2 text-success"></i>Monetary Support</h4>
                        <div class="payment-details">
                            ${shelter.upi_id ? `<div class="item"><span><strong>UPI ID:</strong> ${shelter.upi_id}</span><button class="copy-btn" onclick="copyToClipboard('${shelter.upi_id}', 'UPI ID')"><i class="fas fa-copy"></i></button></div>` : ''}
                            ${shelter.bank_account_name ? `<div class="item"><span><strong>A/C Name:</strong> ${shelter.bank_account_name}</span></div>` : ''}
                            ${shelter.bank_account_number ? `<div class="item"><span><strong>A/C No:</strong> ${shelter.bank_account_number}</span><button class="copy-btn" onclick="copyToClipboard('${shelter.bank_account_number}', 'Account No')"><i class="fas fa-copy"></i></button></div>` : ''}
                            ${shelter.bank_ifsc_code ? `<div class="item"><span><strong>IFSC:</strong> ${shelter.bank_ifsc_code}</span><button class="copy-btn" onclick="copyToClipboard('${shelter.bank_ifsc_code}', 'IFSC Code')"><i class="fas fa-copy"></i></button></div>` : ''}
                        </div>
                    </div>
                </div>
            ` : '';

            shelterContentContainer.innerHTML = `
                <section class="shelter-header" style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${imageUrl}');">
                    <div class="container">
                        <div class="shelter-header-content text-center">
                            <h1 class="shelter-title">${shelter.name}</h1>
                            <p class="shelter-description">${shelter.description}</p>
                            ${socialLinksHTML ? `<ul class="social-icons justify-content-center mt-3">${socialLinksHTML}</ul>` : ''}
                        </div>
                    </div>
                </section>

                <div class="container py-5">
                    <div class="row g-4">
                        <div class="col-lg-6">
                            <div class="shelter-info-card h-100">
                                <h4 class="mb-3"><i class="fas fa-info-circle me-2 text-primary"></i>Contact & Drop-off</h4>
                                <div class="info-item">
                                    <div class="info-icon"><i class="fas fa-map-marked-alt"></i></div>
                                    <div class="info-content"><h6>Address</h6><p>${shelter.full_address || 'Not provided'}</p></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-icon"><i class="fas fa-phone"></i></div>
                                    <div class="info-content"><h6>Phone</h6><p>${shelter.contact_phone || 'Not provided'}</p></div>
                                </div>
                            </div>
                        </div>
                        ${financialInfoHTML}
                    </div>
                </div>

                <div class="container py-5">
                    <div class="text-center mb-5"><h2 class="display-6 fw-bold mb-3">Item Wishlist</h2></div>
                    <div class="row g-4">
                        <div class="col-lg-4"><div class="card need-card new-items-card h-100"><div class="card-header-custom"><i class="fas fa-shopping-cart card-title-icon new-items-icon"></i><h3 class="card-title-custom">New Items</h3></div><div class="card-body-custom"><ul class="needs-list">${createNeedsList('New Item')}</ul></div></div></div>
                        <div class="col-lg-4"><div class="card need-card urgent-card h-100"><div class="card-header-custom"><i class="fas fa-exclamation-triangle card-title-icon urgent-icon"></i><h3 class="card-title-custom">Urgent Essentials</h3></div><div class="card-body-custom"><ul class="needs-list">${createNeedsList('Urgent')}</ul></div></div></div>
                        <div class="col-lg-4"><div class="card need-card preloved-card h-100"><div class="card-header-custom"><i class="fas fa-recycle card-title-icon preloved-icon"></i><h3 class="card-title-custom">Pre-Loved Donations</h3></div><div class="card-body-custom"><ul class="needs-list">${createNeedsList('Pre-Loved')}</ul></div></div></div>
                    </div>
                </div>`;
        };
        
        // Make the copy function globally accessible for the inline onclick attribute
        window.copyToClipboard = (text, type) => {
            navigator.clipboard.writeText(text).then(() => {
                const notification = document.createElement('div');
                notification.className = 'alert alert-success position-fixed top-0 end-0 m-3';
                notification.style.zIndex = 1050;
                notification.textContent = `${type} copied to clipboard!`;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 2000);
            });
        };

        loadShelterDetails();
    }
    
    // --- Shelters Listing Page Logic (shelters.html) - [UPDATED] ---
    const shelterList = document.getElementById('shelterList');
    if (shelterList) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const noResults = document.getElementById('noResults');
        const searchBar = document.getElementById('searchBar');
        const locationFilter = document.getElementById('locationFilter');
        const filterButtons = document.querySelectorAll('.filter-btn');

        let allShelters = [];
        let currentFilter = 'all';
        let currentLocation = '';
        let currentSearch = '';

        function createShelterCardHTML(shelter) {
            const types = shelter.animal_types ? shelter.animal_types.split(' ') : [];
            let typesHTML = '';
            if (types.includes('dogs')) typesHTML += '<i class="fas fa-dog me-1"></i>Dogs ';
            if (types.includes('cats')) typesHTML += ' <i class="fas fa-cat me-1"></i>Cats ';
            if (types.includes('wildlife')) typesHTML += ' <i class="fas fa-kiwi-bird me-1"></i>Wildlife';

            const shelterLink = `shelter.html?id=${shelter.id}`;
            const imageUrl = shelter.image_url 
                ? `${SUPABASE_URL}/storage/v1/object/public/shelter-images/${shelter.image_url}` 
                : 'https://placehold.co/600x400/667eea/ffffff?text=Shelter';

            return `
                <div class="col-lg-4 col-md-6 shelter-card">
                    <div class="card h-100">
                        ${shelter.has_urgent_needs ? '<div class="urgent-badge"><i class="fas fa-exclamation-triangle me-1"></i>Urgent</div>' : ''}
                        <img src="${imageUrl}" class="card-img-top" alt="${shelter.name}">
                        <div class="card-body d-flex flex-column">
                            <div class="shelter-meta">
                                <span class="shelter-location">
                                    <i class="fas fa-map-marker-alt me-1"></i>${shelter.location_city}, ${shelter.location_state}
                                </span>
                            </div>
                            <h5 class="card-title">${shelter.name}</h5>
                            <div class="shelter-type mb-3">${typesHTML.trim()}</div>
                            <p class="card-text">${shelter.description}</p>
                            <a href="${shelterLink}" class="btn-needs w-100 mt-auto">
                                <i class="fas fa-heart me-2"></i>View Complete Wishlist
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }

        function filterAndRenderShelters() {
            const filteredShelters = allShelters.filter(shelter => {
                const shelterName = shelter.name.toLowerCase();
                const shelterLocation = shelter.location_city;
                const shelterTypes = shelter.animal_types || "";
                const isUrgent = shelter.has_urgent_needs;
                
                const matchesSearch = shelterName.includes(currentSearch) || shelterLocation.toLowerCase().includes(currentSearch);
                const matchesLocation = !currentLocation || shelterLocation === currentLocation;
                let matchesType = true;
                if (currentFilter !== 'all') {
                    matchesType = (currentFilter === 'urgent') ? isUrgent : shelterTypes.includes(currentFilter);
                }
                return matchesSearch && matchesLocation && matchesType;
            });

            shelterList.innerHTML = '';
            if (filteredShelters.length > 0) {
                filteredShelters.forEach(shelter => {
                    shelterList.innerHTML += createShelterCardHTML(shelter);
                });
            }
            noResults.classList.toggle('d-none', filteredShelters.length === 0);
        }

        async function loadShelters() {
            loadingSpinner.style.display = 'block';
            try {
                const { data, error } = await supabase
                    .from('shelters')
                    .select('*')
                    .eq('is_verified', true);

                if (error) throw error;
                
                allShelters = data || [];
                filterAndRenderShelters();

            } catch (error) {
                console.error('Error loading shelters:', error.message);
                shelterList.innerHTML = '<p class="text-center text-danger">Could not load shelter data. Please try again later.</p>';
            } finally {
                loadingSpinner.style.display = 'none';
            }
        }

        searchBar.addEventListener('keyup', (e) => {
            currentSearch = e.target.value.toLowerCase();
            filterAndRenderShelters();
        });
        locationFilter.addEventListener('change', (e) => {
            currentLocation = e.target.value;
            filterAndRenderShelters();
        });
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                filterAndRenderShelters();
            });
        });

        loadShelters();
    }

});