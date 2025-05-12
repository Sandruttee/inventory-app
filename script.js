const sheetURL =
  "https://script.google.com/macros/s/AKfycbxFPIFhk2KeIddQRdpjIrFP_FOaknrxeJxutdTR9CMslxwJbQ68p5hAwpQT8DZXkIq7/exec";

function addItem() {
  const barcode = document.getElementById("adminBarcode").value.trim();
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value.trim();

  if (!barcode || !name || !price) {
    alert("Reikia užpildyti visus laukelius");
    return;
  }

  fetch(sheetURL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      mode: "add",
      barcode,
      name,
      price,
    }),
  })
    .then((res) => res.json())
    .then((msg) => {
      const message = `Prekė pridėta:\n- Barkodas: ${barcode}\n- Prekės pavadinimas: ${name}\n- Prekės kainas: $${parseFloat(
        price
      ).toFixed(2)}`;
      alert(message);
    })
    .catch((err) => alert("Įvyko klaida: " + err));
}

function searchItem() {
  const input = document.getElementById("searchInput").value.trim();
  if (!input) {
    alert("Užpildykite paieškos laukelį");
    return;
  }

  const url = `${sheetURL}?search=${encodeURIComponent(input)}`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const resultDiv = document.getElementById("result");
      resultDiv.innerHTML = "";

      if (data.message) {
        resultDiv.textContent = data.message;
      } else {
        resultDiv.innerHTML = `<strong>Barkodas:</strong> ${
          data.barcode
        }<br><strong>Prekės pavadinimas:</strong> ${
          data.name
        }<br><strong>Prekės kaina:</strong> $${parseFloat(data.price).toFixed(
          2
        )}`;
      }
    })
    .catch((err) => alert("Įvyko klaida: " + err));
}
function viewInventory() {
  // Use an empty search parameter to fetch all items
  const url = `${sheetURL}?search=`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const inventoryListDiv = document.getElementById("inventoryList");
      inventoryListDiv.innerHTML = "";

      // Log the response to inspect the data structure
      console.log(data);

      // If data is an array of items, display each item
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((item) => {
          const itemDiv = document.createElement("div");
          itemDiv.classList.add("inventoryItem");
          itemDiv.innerHTML = `<strong>Barkodas:</strong> ${
            item.barcode
          }<br><strong>Prekės pavadinimas:</strong> ${
            item.name
          }<br><strong>Prekės kaina:</strong> $${parseFloat(item.price).toFixed(
            2
          )}`;
          inventoryListDiv.appendChild(itemDiv);
        });
      } else {
        inventoryListDiv.textContent = "Nėra jokių pridėtų prekių";
      }
    })
    .catch((err) => alert("Įvyko klaida: " + err));
}

function checkAdminPassword() {
  const password = document.getElementById("adminPassword").value;
  const correctPassword = "letmein"; // change this to your own secret

  const message = document.getElementById("adminLoginMessage");

  if (password === correctPassword) {
    document.getElementById("adminSection").style.display = "block";
    document.getElementById("adminLogin").style.display = "none";
    message.textContent = "";
  } else {
    message.textContent = "Neteisingas slaptažodis. Pabandykite dar kartą.";
    message.style.color = "red";
  }
}

function toggleLoginForm() {
  const adminLoginForm = document.getElementById("adminLogin");
  if (
    adminLoginForm.style.display === "none" ||
    !adminLoginForm.style.display
  ) {
    adminLoginForm.style.display = "block";
  } else {
    adminLoginForm.style.display = "none";
  }
}
