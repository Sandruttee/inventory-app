const sheetURL =
  "https://script.google.com/macros/s/AKfycbxFPIFhk2KeIddQRdpjIrFP_FOaknrxeJxutdTR9CMslxwJbQ68p5hAwpQT8DZXkIq7/exec";

function startBarcodeScanner() {
  const scannerDiv = document.getElementById("barcodeScanner");

  const html5QrCode = new Html5Qrcode("barcodeScanner");

  html5QrCode
    .start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: 250,
      },
      (decodedText, decodedResult) => {
        document.getElementById("adminBarcode").value = decodedText;
        html5QrCode.stop();
        document.getElementById("barcodeScanner").innerHTML = "";
      },
      (errorMessage) => {
        console.log(errorMessage);
      }
    )
    .catch((err) => {
      console.log("Error starting the scanner: ", err);
    });
}

function startSearchScanner() {
  const scannerDiv = document.getElementById("searchScanner");
  scannerDiv.innerHTML = "";

  const html5QrCode = new Html5Qrcode("searchScanner");

  html5QrCode
    .start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: 250,
      },
      (decodedText) => {
        document.getElementById("searchInput").value = decodedText;
        html5QrCode.stop().then(() => {
          scannerDiv.innerHTML = "";
        });
      },
      (errorMessage) => {
        console.warn("Scan error", errorMessage);
      }
    )
    .catch((err) => {
      console.error("Failed to start scanner", err);
    });
}

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
      const resultDiv = document.getElementById("newItemDisplay");
      resultDiv.innerHTML = `<h3>Prekė sėkmingai pridėta:</h3>
        <strong>Barkodas:</strong> ${barcode}<br>
        <strong>Prekės pavadinimas:</strong> ${name}<br>
        <strong>Prekės kaina:</strong> $${parseFloat(price).toFixed(2)}
      `;

      document.getElementById("adminBarcode").value = "";
      document.getElementById("itemName").value = "";
      document.getElementById("itemPrice").value = "";
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
  const url = `${sheetURL}?search=`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const inventoryListDiv = document.getElementById("inventoryList");
      inventoryListDiv.innerHTML = "";

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
  const correctPassword = "ananasas"; // change this to your own secret

  const message = document.getElementById("adminLoginMessage");

  if (password === correctPassword) {
    document.getElementById("adminSection").style.display = "block";
    document.getElementById("welcomeMessage").textContent =
      "Sveiki, Evaldai! Jūs sėkmingai prisijungėte ir galite pridėti naujas prekes!";
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

document.addEventListener("DOMContentLoaded", () => {
  const inventoryListDiv = document.getElementById("inventoryList");
  if (inventoryListDiv) {
    fetch(`${sheetURL}?search=`)
      .then((res) => res.json())
      .then((data) => {
        inventoryListDiv.innerHTML = "";

        if (Array.isArray(data) && data.length > 0) {
          data.forEach((item) => {
            const div = document.createElement("div");
            div.classList.add("inventoryItem");
            div.innerHTML = `
              <strong>Barkodas:</strong> ${item.barcode}<br>
              <strong>Prekės pavadinimas:</strong> ${item.name}<br>
              <strong>Prekės kaina:</strong> $${parseFloat(item.price).toFixed(
                2
              )}
              <hr />
            `;
            inventoryListDiv.appendChild(div);
          });
        } else {
          inventoryListDiv.textContent = "Nėra jokių prekių.";
        }
      })
      .catch((err) => {
        inventoryListDiv.textContent = "Klaida įkeliant prekes.";
        console.error(err);
      });
  }
});
