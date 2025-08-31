// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // --- SUPABASE CONFIGURATION ---
    const SUPABASE_URL = 'https://lgrdixuixmjdsheyxsys.supabase.co'; 
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncmRpeHVpeG1qZHNoZXl4c3lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1Nzc4NTIsImV4cCI6MjA3MjE1Mzg1Mn0.2D16XP4T2yccB038m5GWkr_HzkTnsnbc2qcyrQ22Jk4';

    // The supabase object is available globally from the CDN script. We use it directly.
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // --- DOM Elements ---
    const shelterList = document.getElementById('shelterList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noResults = document.getElementById('noResults');
    const searchBar = document.getElementById('searchBar');
    const locationFilter = document.getElementById('locationFilter');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // --- State ---
    let allShelters = [];
    let currentFilter = 'all';
    let currentLocation = '';
    let currentSearch = '';

    // --- HELPER FUNCTION ---
    function createShelterCardHTML(shelter) {
        const typesHTML = `
            ${shelter.animal_types.includes('dogs') ? '<i class="fas fa-dog me-1"></i>Dogs' : ''}
            ${shelter.animal_types.includes('cats') ? ' • <i class="fas fa-cat me-1"></i>Cats' : ''}
            ${shelter.animal_types.includes('wildlife') ? ' • <i class="fas fa-kiwi-bird me-1"></i>Wildlife' : ''}
        `.trim();
        const shelterLink = `shelter.html?id=${shelter.id}`;
        return `
            <div class="col-lg-4 col-md-6 shelter-card" data-location="${shelter.location_city}" data-type="${shelter.animal_types}" data-urgent="${shelter.has_urgent_needs}">
                <div class="card h-100">
                    ${shelter.has_urgent_needs ? '<div class="urgent-badge"><i class="fas fa-exclamation-triangle me-1"></i>Urgent</div>' : ''}
                    <img src="${shelter.image_url || 'https://placehold.co/600x400/667eea/ffffff?text=Shelter'}" class="card-img-top" alt="${shelter.name}">
                    <div class="card-body d-flex flex-column">
                        <div class="shelter-meta">
                            <span class="shelter-location">
                                <i class="fas fa-map-marker-alt me-1"></i>${shelter.location_city}, ${shelter.location_state}
                            </span>
                        </div>
                        <h5 class="card-title">${shelter.name}</h5>
                        <div class="shelter-type mb-3">${typesHTML}</div>
                        <p class="card-text">${shelter.description}</p>
                        <a href="${shelterLink}" class="btn-needs w-100 mt-auto">
                            <i class="fas fa-heart me-2"></i>View Complete Wishlist
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Main filter function ---
    function filterAndRenderShelters() {
        const filteredShelters = allShelters.filter(shelter => {
            const shelterName = shelter.name.toLowerCase();
            const shelterLocation = shelter.location_city;
            const shelterTypes = shelter.animal_types;
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
        noResults.classList.toggle('d-none', filteredShelters.length > 0);
    }

    // --- Fetches shelter data from Supabase ---
    async function loadShelters() {
        loadingSpinner.style.display = 'block';
        try {
            const { data, error } = await supabaseClient
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

    // --- Event Listeners ---
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

    // --- Initial Load ---
    loadShelters();
});

