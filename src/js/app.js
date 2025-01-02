// Firebase imports.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, update, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

let database; // Reference to firebase database.

let canvas, ctx; // Canvas and CTX access.
let mouseX, mouseY; // Mouse coordinates when on canvas.
let pixelsArray = []; // Stores a 2D array containing all pixels being drawed.
let pixelSize = 12; // Size of the pixel when drawing from pixels array.
let x = 30; // X Coordinate normalized in the pixels array.
let y = 30; // Y Coordinate normalized in the pixels array.
let isDrawing = false; // Used for very long drawings instead of clicks.

const usersArray = []; // Stores all users connected to the server.

// Store a list of pre-selected standar colors for the users.
const colorsAvailable = {
    black: "black",
    white: "white",
    gray: "gray",

    red: "red",
    green: "green",
    blue: "blue",

    cyan: "cyan",
    magenta: "magenta",
    yellow: "yellow",

    orange: "orange",
    purple: "purple",
    pink: "pink",

    gold: "gold",
    silver: "silver",
    greenyellow: "greenyellow",

    lightpink: "lightpink",
    lightblue: "lightblue",
    lightcoral: "lightcoral",

    lightsalmon: "lightsalmon",
    lightseagreen: "lightseagreen",
    lightskyblue: "lightskyblue",

    springgreen: "springgreen",
    tomato: "tomato",
    violet: "violet"
};

// This will store the color selected by the user locally, not in the database.
let colorSelected = colorsAvailable["black"];

window.addEventListener("DOMContentLoaded", () => {

    // HTML access.
    const menuContainer = document.getElementById("menu-container");
    const colorPickerMenu = document.getElementById("color-picker-menu");

    const addColorInput = document.getElementById("add-color-input");
    const addColorBtn = document.getElementById("add-color-btn");
    const addRandomColorBtn = document.getElementById("add-random-color-btn");

    const usernameInput = document.getElementById("username-input");
    const changeUsernameBtn = document.getElementById("change-username-btn");

    // Get access to canvas and CTX.
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    // Set canvas size.
    canvas.width = 720;
    canvas.height = 720;

    // Creates an 60x60 array based on canvas size and pixel size.
    pixelsArray = new Array(60).fill("white").map(() => {
        return new Array(60).fill("white");
    });

    // Prevent right click on the game.
    window.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    // Start game loop.
    requestAnimationFrame(gameLoop);

    // Firebase configuration object.
    const firebaseConfig = {
        apiKey: "AIzaSyAksmbsypr__3TrRyp8a6Nkjj3TP-Jphtk",
        authDomain: "worldcanvas-f7851.firebaseapp.com",
        databaseURL: "https://worldcanvas-f7851-default-rtdb.firebaseio.com",
        projectId: "worldcanvas-f7851",
        storageBucket: "worldcanvas-f7851.firebasestorage.app",
        messagingSenderId: "137712393427",
        appId: "1:137712393427:web:6a33f26264e9146112c826",
        measurementId: "G-GHJ9E4K3Q3"
    };

    const app = initializeApp(firebaseConfig); // Initialize firebase.
    const auth = getAuth(); // Enable authentication.
    database = getDatabase(app); // Get database connection.

    const usersDBRef = ref(database, "users"); //Point to users path in DB.
    const canvasDBRef = ref(database, "canvas"); // Point to canvas path in DB.

    // Firebase method to authenticate user.
    signInAnonymously(auth).then(() => {

        // Listen for changes on user.
        onAuthStateChanged(auth, (user) => {

            // If you get here, the connection to firebase was succesful.
            if (user) {

                // Write initial user data into database when logged in.
                set(
                    ref(database, "users/" + user.uid),
                    {
                        id: user.uid, // Generated by firebase.
                        username: "Guest", // Default username.
                        x: 30,
                        y: 30,
                        color: colorSelected // Default selection is "black".
                    }
                );

                // Listener to delete user data when disconnects.
                const userRef = ref(database, "users/" + user.uid);
                onDisconnect(userRef).set({});

                // Listener to reconnect the user to the database.
                window.addEventListener("online", (e) => {

                    set(
                        ref(database, "users/" + user.uid),
                        {
                            id: user.uid, // Generated by firebase.
                            username: "Reconnected", // Check if was reconnected.
                            x: 30,
                            y: 30,
                            color: colorSelected // Current color selecter.
                        }
                    );
                });

                // Create map. Don't uncomment this, or all canvas will be deleted.
                // set(ref(database, "canvas"), pixelsArray);

                // Listener to hide/show all menus.
                window.addEventListener("keydown", (e) => {

                    if (e.key === " ") {

                        e.preventDefault(); // Prevent default spacebar behavior.

                        if (menuContainer.style.display === "none") {
                            menuContainer.style.display = "block";
                        } else {
                            menuContainer.style.display = "none";
                        }
                    }
                });

                // Listener to add a color selected by the user.
                addColorBtn.addEventListener("click", (e) => {

                    if (addColorInput.value === "") return;

                    colorsAvailable[addColorInput.value] = addColorInput.value;
                    addColorInput.value = "";
                    addColors(); // Reload all colors in the menu palette.
                });

                // Listener to add a random color.
                addRandomColorBtn.addEventListener("click", (e) => {

                    // Generate random values for the RGB combination.
                    let r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
                    let g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
                    let b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');

                    // Generate the RGB color.
                    let rgb = "#" + r + g + b;
                    colorsAvailable[rgb] = rgb; // Add color to the options available.
                    addColors(); // Reload all colors in the menu palette.
                });

                // Listener to change the username.
                changeUsernameBtn.addEventListener("click", (e) => {

                    // Prevent an empty username.
                    if (usernameInput.value === "") return;

                    // Upate the username field on database.
                    update(ref(database, "users/" + user.uid),
                        {
                            username: usernameInput.value
                        }
                    );

                    usernameInput.value = ""; // Empty the input field.
                });

                // Add default color palette to the menu.
                addColors();

                // This function empty the color menu and re-adds them again.
                function addColors() {

                    // Emtpy the DIV.
                    colorPickerMenu.innerHTML = "";

                    // Add each color to the menu.
                    for (const color in colorsAvailable) {

                        const div = document.createElement("div");
                        div.style.backgroundColor = color;
                        colorPickerMenu.appendChild(div);

                        // Listener to change color selected and update the database.
                        div.addEventListener("click", (e) => {

                            colorSelected = color;

                            // Update the color field to show all users the new color.
                            update(ref(database, "users/" + user.uid),
                                {
                                    color: colorSelected
                                }
                            );
                        });
                    }
                }

                // Listener to draw pixels on the canvas.
                canvas.addEventListener("click", (e) => {

                    // Prevent unexpected values.
                    if (x < 0) return;
                    if (x > 59) return;
                    if (y < 0) return;
                    if (y > 59) return;
                    if (x === undefined || y === undefined) return;
                    if (x === null || y === null) return;

                    // Update pixel modified in the database.
                    let pixelModified = { [`${x}/${y}`]: colorSelected };
                    update(ref(database, "canvas"), pixelModified);
                });

                // Update mouse X an Y coordinates eacn time it moves on canvas.
                canvas.addEventListener("mousemove", (e) => {

                    // Get mouse new coordinates.
                    mouseX = e.clientX - canvas.getBoundingClientRect().left;
                    mouseY = e.clientY - canvas.getBoundingClientRect().top;

                    // Update values in the database.
                    update(ref(database, "users/" + user.uid),
                        {
                            x: x,
                            y: y
                        }
                    );
                });

                // Track if user is clicking.
                canvas.addEventListener("mousedown", (e) => {
                    if (e.button === 0) isDrawing = true;
                });

                // Track if user stops clicking.
                canvas.addEventListener("mouseup", (e) => {
                    isDrawing = false;
                });

                // Track if user mouse gets out the canvas.
                canvas.addEventListener("mouseout", (e) => {
                    isDrawing = false;
                });

                // Listener to get all new users.
                onChildAdded(usersDBRef, (snapshot) => {

                    const data = snapshot.val();
                    usersArray.push(data);

                    console.log("User connected.");
                    console.log(usersArray);
                });

                // Listener to update users information.
                onChildChanged(usersDBRef, (snapshot) => {

                    const data = snapshot.val();

                    for (let i = 0; i < usersArray.length; i++) {

                        const u = usersArray[i];
                        if (u.id === data.id) usersArray[i] = data;
                    }

                    console.log("User modified.");
                    console.log(usersArray);
                });

                // Listener to remove user when the disconnects.
                onChildRemoved(usersDBRef, (snapshot) => {

                    const data = snapshot.val();

                    for (let i = 0; i < usersArray.length; i++) {

                        const u = usersArray[i];
                        if (u.id === data.id) usersArray.splice(i, 1);
                    }

                    console.log("User disconnected.");
                    console.log(usersArray);
                });

                // Listener to get all changes made to the canvas.
                onValue(canvasDBRef, (snapshot) => {

                    const data = snapshot.val();
                    pixelsArray = data;

                    console.log("Canvas modified.");
                    console.log(data);
                });

            } else {

                console.log("Signed out.");
            }
        });

    }).catch((error) => {

        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("Sign in error.");
    });
});

function gameLoop() {

    // Clear canvas.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Upate user coordinates when clicks on the canvas.
    if (isDrawing) {

        let pixelModified = { [`${x}/${y}`]: colorSelected };
        update(ref(database, "canvas"), pixelModified);
    }

    // Loop pixels array.
    for (let i = 0; i < pixelsArray.length; i++) {
        for (let j = 0; j < pixelsArray[i].length; j++) {

            // Draw pixels.
            ctx.fillStyle = pixelsArray[i][j];

            ctx.fillRect(
                i * pixelSize,
                j * pixelSize,
                pixelSize,
                pixelSize
            );

            // Get mouse current coordinates.
            if (mouseX > i * pixelSize && mouseX < (i + 1) * pixelSize
                && mouseY > j * pixelSize && mouseY < (j + 1) * pixelSize) {

                x = i;
                y = j;

                if (x < 0) x = 0;
                if (x > 59) x = 59;
                if (y < 0) y = 0;
                if (y > 59) y = 59;
            }
        }
    }

    // Draw all users information.
    for (let i = 0; i < usersArray.length; i++) {

        let user = usersArray[i];

        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = user.color;

        // Draw usernames.
        if (i === 0) ctx.fillText(user.username, mouseX + 4, mouseY - 14);
        if (i !== 0) ctx.fillText(user.username, user.x * pixelSize + 6, user.y * pixelSize - 8);

        // Draw color selected, and X and Y user coordinates.
        if (i !== 0) ctx.fillRect(user.x * pixelSize, user.y * pixelSize, pixelSize, pixelSize);
    }

    // Draw pixel being selected by your user.
    ctx.strokeStyle = "black";
    ctx.strokeRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

    // Draw color selected by your user.
    ctx.fillStyle = colorSelected;
    ctx.fillRect(mouseX + 12, mouseY - 12, pixelSize, pixelSize);

    // Call next frame.
    requestAnimationFrame(gameLoop);
}