let artisans = []; //store data fetched
let favorites = []; //store ids of favorite artisans
const API_URL = 'http://localhost:3000/artisans'; //stores url to the artisan endpoint

//grab elements
const searchInput = document.getElementById('searchInput');
const skillFilter = document.getElementById('skillFilter');
const locationFilter = document.getElementById('locationFilter');
const artisanGrid = document.getElementById('artisanGrid');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const artisanForm = document.getElementById('artisanForm');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const favoritesGrid = document.getElementById('favoritesGrid');
const noFavorites = document.getElementById('noFavorites');

document.addEventListener('DOMContentLoaded', function () {
    loadArtisans();
    loadFavorites();
    setupEventListeners();
});

//event listeners for the three tabs
function setupEventListeners() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener('click', function () {
            switchTab(this.dataset.tab);       
        });
    
    });

    //event listeners for the search bar
    searchInput.addEventListener('input', debounce(filterArtisans, 300));
    skillFilter.addEventListener('change', filterArtisans);
    locationFilter.addEventListener('change', filterArtisans);
    //event listener for artisan registration form
    artisanForm.addEventListener('submit', handleFormSubmit);

}

//load artisans
async function loadArtisans() {
    try {
        loading.style.display = "block";
        const response = await fetch(API_URL); //send GET request to endpoint

        if(!response.ok) throw new Error("Failed to fetch artisans");
        artisans = await response.json(); //store response in artisans

        displayArtisans(artisans);
    } catch(error) {
        console.error("Error loading artisans:", error);
        showError('Failed to load artisans.');
    } finally {
        loading.style.display = 'none';
    }

}

//register an artisan
async function addArtisan(artisanData) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST', //request for sending new data
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(artisanData) //convert artisan data into a JSON string
        });

        if (!response.ok) throw new Error('Failed to add artisan');

        const newArtisan = await response.json(); //wait for server to respond with added artisan
        artisans.push(newArtisan); //add new artisan to artisans array

        displayArtisans(artisans);//renders all artisans again

        showSuccess('Artisan registered successfully!');

        artisanForm.reset(); //clear form fields

        return newArtisan;
    } catch (error) {
        console.error('Error adding artisan:', error); //logged on console
        showError('Failed to register artisan.'); 
    }
}

window.upvoteArtisan = upvoteArtisan;

//update upvotes
async function updateArtisan(id, updates) {
    const response = await fetch(`${API_URL}/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });

    if (!response.ok) throw new Error('Failed to update artisan');
    return await response.json();
}

// upvotes
async function upvoteArtisan(id) {
    //get the list of artisan IDs the user has already upvoted
    let upvotedArtisans = JSON.parse(localStorage.getItem('upvotedArtisans')) || [];
    //returns an error when user tries to upvote more than once
    if(upvotedArtisans.includes(id)) {
        showError("You have already upvoted this artisan!");
        return;
    }
    //find the artisan from the current artisan list
    const artisan = artisans.find(a => String(a.id) === String(id));
    if (artisan) {
        const updatedArtisan = { ...artisan, upvotes: (artisan.upvotes || 0) + 1 };

        try {
            const result = await updateArtisan(id, updatedArtisan);

            //update artisan list
            const index = artisans.findIndex(a => String(a.id) === String(id));
            if (index !== -1) artisans[index] = result;

            //save artisan ID to prevent upvoting more than once
            upvotedArtisans.push(id);
            localStorage.setItem('upvotedArtisans', JSON.stringify(upvotedArtisans));

            //render the artisan list
            displayArtisans(filterCurrentArtisans());

            if (document.getElementById('favorites').classList.contains('active')) {
                displayFavorites();
            }
        } catch (err) {
            console.error('Upvote failed:', err);
            showError('Failed to upvote artisan.');
        }
    }
}

window.toggleFavorite = toggleFavorite; //makes the toggle function accessible globally
// display artisans
function displayArtisans(artisansToShow) {
    //if the list is empty shows no results
    if (artisansToShow.length === 0) {
        artisanGrid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    artisanGrid.innerHTML = artisansToShow.map(artisan => 
        `<div class="artisan-card">
            <div class="artisan-header">
                <div>
                    <div class="artisan-name">${artisan.name}</div>
                    <div class="artisan-skill">${artisan.skill}</div>
                    <div class="artisan-location">📍 ${artisan.location}</div>
                </div>
            </div>

            <div class="artisan-contact">
                📞 ${artisan.phone}
                ${artisan.email ? `<br>📧 ${artisan.email}` : ''}
            </div>
            <div class="artisan-contact">
                📅 ${artisan.experience} years experience
            </div>
            ${artisan.description ? `<div class="artisan-contact">${artisan.description}</div>` : ''}

            <div class="artisan-actions">
                <button class="upvote-btn" onclick="upvoteArtisan('${artisan.id}')">
                    👍 ${artisan.upvotes || 0}
                </button>

                <button class="favorite-btn ${isFavorited(artisan.id) ? 'favorited' : ''}" 
                        onclick="toggleFavorite('${artisan.id}')">
                    ${isFavorited(artisan.id) ? '❤️ Remove' : '🤍 Favorite'}
                </button>

            </div>
        </div>`).join(''); //convert list of artisans into one string of html
}

//search filters
function filterArtisans() {
    //read the values from the inputs
    const searchTerm = searchInput.value.toLowerCase();
    const skillValue = skillFilter.value;
    const locationValue = locationFilter.value;
    //looks for a match for the search value
    const filtered = artisans.filter(artisan => {
        const matchesSearch = artisan.name.toLowerCase().includes(searchTerm) ||
            artisan.skill.toLowerCase().includes(searchTerm) ||
            artisan.location.toLowerCase().includes(searchTerm);

        const matchesSkill = !skillValue || artisan.skill === skillValue;
        const matchesLocation = !locationValue || artisan.location === locationValue;

        return matchesSearch && matchesSkill && matchesLocation; //all three must be true for artisan to show
    });

    displayArtisans(filtered); //displays the filtered list
}

//return matching artisans without displaying
function filterCurrentArtisans() {
    return artisans.filter(artisan => {
        const searchTerm = searchInput.value.toLowerCase();
        const skillValue = skillFilter.value;
        const locationValue = locationFilter.value;

        const matchesSearch = artisan.name.toLowerCase().includes(searchTerm) ||
            artisan.skill.toLowerCase().includes(searchTerm) ||
            artisan.location.toLowerCase().includes(searchTerm);

        const matchesSkill = !skillValue || artisan.skill === skillValue;
        const matchesLocation = !locationValue || artisan.location === locationValue;

        return matchesSearch && matchesSkill && matchesLocation;
    });
}

// enables switching between tabs
function switchTab(tabName) {
    //deselect all tab buttons
    document.querySelectorAll('.tab').forEach(tab => { 
        tab.classList.remove('active');
    });
    //activate corresponding selected tab button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active'); 
    //hide all content areas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active'); 
    });
    //show the selected tab content
    document.getElementById(tabName).classList.add('active'); 
    //check if user clicked on favorites
    if (tabName === 'favorites') {
        displayFavorites();
    }
}

// add artisan form submission
async function handleFormSubmit(e) {
    e.preventDefault(); //prevent page from reloading
    const formData = new FormData(artisanForm);

    const artisanData = {
        name: formData.get('name'),
        skill: formData.get('skill'),
        location: formData.get('location'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        experience: parseInt(formData.get('experience')),
        description: formData.get('description'),
        upvotes: 0, //new artisan starts with 0 upvotes
        dateAdded: new Date().toISOString() //timestamp
    };
    //send data to backend and update the frontend
    await addArtisan(artisanData);
}

//load favorites
async function loadFavorites() {
    try {
        //make GET request to backend at /favorites
        const res = await fetch('http://localhost:3000/favorites');

        if (!res.ok) throw new Error('Failed to load favorites');

        const data = await res.json();
        favorites = data.map(f => f.artisanId); //holds artisanIds
    } catch (error) {
        console.error('Error loading favorites:', error); //runs incase of an error
    }
}

// Display favorites
function displayFavorites() {
    const favoriteArtisans = artisans.filter(artisan => favorites.includes(artisan.id));

    if (favoriteArtisans.length === 0) {
        favoritesGrid.innerHTML = '';
        noFavorites.style.display = 'block';
        return;
    }

    noFavorites.style.display = 'none';

    favoritesGrid.innerHTML = favoriteArtisans.map(artisan => `
        <div class="artisan-card">
            <div class="artisan-header">
                <div>
                    <div class="artisan-name">${artisan.name}</div>
                    <div class="artisan-skill">${artisan.skill}</div>
                    <div class="artisan-location">📍 ${artisan.location}</div>
                </div>
            </div>
            <div class="artisan-contact">
                📞 ${artisan.phone}
                ${artisan.email ? `<br>📧 ${artisan.email}` : ''}
            </div>
            <div class="artisan-contact">
                📅 ${artisan.experience} years experience
            </div>
            ${artisan.description ? `<div class="artisan-contact">${artisan.description}</div>` : ''}
            <div class="artisan-actions">
                <button class="upvote-btn" onclick="upvoteArtisan('${artisan.id}')">
                    👍 ${artisan.upvotes || 0}
                </button>
                <button class="favorite-btn favorited" onclick="toggleFavorite('${artisan.id}')">
                    ❤️ Remove
                </button>
            </div>
        </div>
    `).join('');
}

// favorite or unfavorite an artisan
async function toggleFavorite(id) {
    //check if artisan is already in favorites array
    const isFav = favorites.includes(id);
    //remove artisan from favorites
    if (isFav) {
        const res = await fetch(`http://localhost:3000/favorites?artisanId=${id}`);
        const favs = await res.json();

        if (favs.length > 0) {
            const favoriteId = favs[0].id; //grab id of the favorite
            await fetch(`http://localhost:3000/favorites/${favoriteId}`, {
                method: 'DELETE' //remove favorite from backend
            });

            favorites = favorites.filter(favId => favId !== id);
        }
    } else {
        //add artisan to favorites
        const res = await fetch('http://localhost:3000/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artisanId: id })
        });
        const newFav = await res.json();
        favorites.push(newFav.artisanId);
    }

    displayArtisans(filterCurrentArtisans()); //update list of artisans
    //refresh to reflect the change
    if (document.getElementById('favorites').classList.contains('active')) {
        displayFavorites();
    }
}

//check if artisan is in the favorites array
function isFavorited(id) {
    return favorites.includes(id);
}
//ensures function waits till user stops typing to run
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}
//success message
function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
    setTimeout(() => successMessage.style.display = 'none', 3000);
}

//error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';
    setTimeout(() => errorMessage.style.display = 'none', 3000);
}


