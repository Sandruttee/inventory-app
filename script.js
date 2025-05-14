const AIRTABLE_TOKEN =
  "patxoFEwtfYJKDwEF.9023c1ad63b49a429aa9538e0b96db32d7c77f74b4fda650896d00600b414fbe";
const AIRTABLE_BASE_ID = "appJUgj3fq2c2Wr7v";
const AIRTABLE_TABLE_NAME = "Table 1";

const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
  AIRTABLE_TABLE_NAME
)}`;

function startBarcodeScanner() {
  const scannerDiv = document.getElementById("barcodeScanner");
  const html5QrCode = new Html5Qrcode("barcodeScanner");

  html5QrCode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
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
      { fps: 10, qrbox: 250 },
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

  const record = {
    fields: {
      Barcode: barcode,
      "Product name": name,
      Price: parseFloat(price),
    },
  };

  fetch(airtableURL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [record] }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) {
        alert(`Įvyko klaida: ${data.error.message}`);
        return;
      }
      const created = data.records[0].fields;
      const resultDiv = document.getElementById("newItemDisplay");
      resultDiv.innerHTML = `<h3>Prekė sėkmingai pridėta:</h3>
        <strong>Barkodas:</strong> ${created.Barcode}<br>
        <strong>Prekės pavadinimas:</strong> ${created["Product name"]}<br>
        <strong>Prekės kaina:</strong> $${parseFloat(created.Price).toFixed(2)}
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

  const filter = encodeURIComponent(
    `OR({Barcode}="${input}", FIND("${input}", {Product name}))`
  );
  const url = `${airtableURL}?filterByFormula=${filter}`;

  fetch(url, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
    .then((res) => res.json())
    .then((data) => {
      const resultDiv = document.getElementById("result");
      resultDiv.innerHTML = "";

      if (data.error) {
        resultDiv.textContent = `Įvyko klaida: ${data.error.message}`;
      } else if (data.records && data.records.length > 0) {
        const item = data.records[0].fields;
        resultDiv.innerHTML = `<strong>Barkodas:</strong> ${item.Barcode}<br>
          <strong>Prekės pavadinimas:</strong> ${item["Product name"]}<br>
          <strong>Prekės kaina:</strong> $${parseFloat(item.Price).toFixed(2)}`;
      } else {
        resultDiv.textContent = "Prekė nerasta";
      }
    })
    .catch((err) => alert("Įvyko klaida: " + err));
}

function viewInventory() {
  fetch(`${airtableURL}?view=Grid%20view`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
    .then((res) => res.json())
    .then((data) => {
      const inventoryListDiv = document.getElementById("inventoryList");
      inventoryListDiv.innerHTML = "";

      if (data.records && data.records.length > 0) {
        data.records.forEach((item) => {
          const fields = item.fields;
          const itemDiv = document.createElement("div");
          itemDiv.classList.add("inventoryItem");
          itemDiv.innerHTML = `<strong>Barkodas:</strong> ${fields.Barcode}<br>
            <strong>Prekės pavadinimas:</strong> ${fields["Product name"]}<br>
            <strong>Prekės kaina:</strong> $${parseFloat(fields.Price).toFixed(
              2
            )}`;
          inventoryListDiv.appendChild(itemDiv);
        });
      } else {
        inventoryListDiv.textContent = "Nėra jokių prekių.";
      }
    })
    .catch((err) => {
      const inventoryListDiv = document.getElementById("inventoryList");
      inventoryListDiv.textContent = "Klaida įkeliant prekes.";
      console.error(err);
    });
}

function checkAdminPassword() {
  const password = document.getElementById("adminPassword").value;
  const correctPassword = "ananasas";
  const message = document.getElementById("adminLoginMessage");

  if (password === correctPassword) {
    document.getElementById("adminSection").style.display = "block";
    document.getElementById("welcomeMessage").textContent =
      "Sveiki, Evaldai! Jūs sėkmingai prisijungėte ir galite pridėti naujas prekes!";
    document.getElementById("adminLogin").style.display = "none";
    message.textContent = "";
  } else {
    message.textContent = "Neteisingas slaptažodžius. Pabandykite dar kartą.";
    message.style.color = "red";
  }
}

function toggleLoginForm() {
  const adminLoginForm = document.getElementById("adminLogin");
  if (
    !adminLoginForm.style.display ||
    adminLoginForm.style.display === "none"
  ) {
    adminLoginForm.style.display = "block";
  } else {
    adminLoginForm.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inventoryListDiv = document.getElementById("inventoryList");
  if (inventoryListDiv) {
    viewInventory();
  }
});
