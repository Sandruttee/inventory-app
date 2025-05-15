const AIRTABLE_TOKEN =
  "patonUvamdRdkFxP4.0b7f2afa1a2904535300554448fb1389baaa22d5d89c782a6f2d1b7cac5ccd2e";
const AIRTABLE_BASE_ID = "appJUgj3fq2c2Wr7v";
const AIRTABLE_TABLE_NAME = "Table 1";
const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
  AIRTABLE_TABLE_NAME
)}`;

const IMGUR_CLIENT_ID = "4cffdea63f8e0fb";

let cameraStream = null;
let photoBlob = null;
let photoDataUrl = "";

function openCamera() {
  const openBtn = document.getElementById("openCameraButton");
  if (openBtn) openBtn.style.display = "none";

  const video = document.getElementById("cameraPreview");
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Camera API not supported.");
    return;
  }
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then((stream) => {
      cameraStream = stream;
      video.srcObject = stream;

      video.style.display = "block";
      document.getElementById("captureButton").style.display = "inline-block";
    })
    .catch((err) => {
      console.error("Error accessing camera", err);
      alert("Nepavyko pasiekti kameros.");

      if (openBtn) openBtn.style.display = "inline-block";
    });
}

function capturePhoto() {
  const video = document.getElementById("cameraPreview");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  photoDataUrl = canvas.toDataURL("image/jpeg", 0.7);

  const imgPreview = document.getElementById("photoPreview");
  imgPreview.src = photoDataUrl;
  imgPreview.style.display = "block";

  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  video.style.display = "none";
  document.getElementById("captureButton").style.display = "none";
}

function startBarcodeScanner() {
  const html5QrCode = new Html5Qrcode("barcodeScanner");
  html5QrCode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        document.getElementById("adminBarcode").value = decodedText;
        html5QrCode.stop();
        document.getElementById("barcodeScanner").innerHTML = "";
      }
    )
    .catch((err) => console.error("Error starting scanner", err));
}

function startSearchScanner() {
  const html5QrCode = new Html5Qrcode("searchScanner");
  html5QrCode
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        document.getElementById("searchInput").value = decodedText;
        html5QrCode.stop().then(() => {
          document.getElementById("searchScanner").innerHTML = "";
        });
      }
    )
    .catch((err) => console.error("Error starting scanner", err));
}

async function addItem() {
  const barcode = document.getElementById("adminBarcode").value.trim();
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value.trim();
  if (!barcode || !name || !price) {
    alert("Please, fill in all data");
    return;
  }

  try {
    const createRes = await fetch(airtableURL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          Barcode: barcode,
          "Product name": name,
          Price: parseFloat(price),
          "Image URL": photoDataUrl,
        },
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(createData.error?.message || `HTTP ${createRes.status}`);
    }

    const resultDiv = document.getElementById("newItemDisplay");
    let html = `<h3>item was added successfully:</h3>
      <strong>Barcode:</strong> ${barcode}<br>
      <strong>Item name:</strong> ${name}<br>
      <strong>Item price:</strong> $${parseFloat(price).toFixed(2)}<br>`;
    if (photoDataUrl) {
      html += `<img src="${photoDataUrl}" alt="Product image" style="max-width:100%;margin-top:10px;">`;
    }
    resultDiv.innerHTML = html;

    ["adminBarcode", "itemName", "itemPrice"].forEach(
      (id) => (document.getElementById(id).value = "")
    );
    photoBlob = null;
    photoDataUrl = "";
    document.getElementById("photoPreview").style.display = "none";
    document.getElementById("openCameraButton").style.display = "inline-block";
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

function searchItem() {
  const input = document.getElementById("searchInput").value.trim();
  if (!input) {
    alert("Please, fill in all data");
    return;
  }

  const filter = encodeURIComponent(
    `OR({Barcode}="${input}", FIND("${input}", {Product name}))`
  );
  const url = `${airtableURL}?filterByFormula=${filter}`;

  fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    .then((res) => res.json())
    .then((data) => {
      const detailsDiv = document.getElementById("resultDetails");
      const imgElem = document.getElementById("searchResultImage");

      detailsDiv.textContent = "";
      imgElem.style.display = "none";
      imgElem.removeAttribute("src");

      if (!data.records || !data.records.length) {
        detailsDiv.textContent =
          "Item was not found, please try again. Make sure it is a correct barcode or item name.";
        return;
      }

      const item = data.records[0].fields;
      detailsDiv.innerHTML = `
        <strong>Barcode:</strong> ${item.Barcode}<br>
        <strong>Item name:</strong> ${item["Product name"]}<br>
        <strong>Item price:</strong> $${item.Price.toFixed(2)}<br>
      `;

      if (item["Image URL"]) {
        imgElem.src = item["Image URL"];
        imgElem.style.display = "block";
      }
    })
    .catch((err) => alert("Error: " + err));
}

function viewInventory() {
  fetch(`${airtableURL}?view=Grid%20view`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  })
    .then((res) => res.json())
    .then((data) => {
      const container = document.getElementById("inventoryList");
      container.innerHTML = "";
      data.records.forEach((rec) => {
        const f = rec.fields;
        let html = `<div class="inventoryItem">
          <strong>Barcode:</strong> ${f.Barcode}<br>
          <strong>Item name:</strong> ${f["Product name"]}<br>
          <strong>Item price:</strong> $${f.Price.toFixed(2)}<br>`;
        if (f.Attachments && f.Attachments.length) {
          html += `<img src="${f.Attachments[0].url}" alt="Product image" style="max-width:100%;margin-top:10px;"/>`;
        }
        html += `</div>`;
        container.innerHTML += html;
      });
      if (!data.records.length) container.textContent = "No items found.";
    })
    .catch((err) => {
      document.getElementById("inventoryList").textContent = "Error.";
      console.error(err);
    });
}

function checkAdminPassword() {
  const pwd = document.getElementById("adminPassword").value;
  const msg = document.getElementById("adminLoginMessage");
  if (pwd === "letmein") {
    document.getElementById("adminSection").style.display = "block";
    document.getElementById("welcomeMessage").textContent =
      "Hello! You have loged in successfully and now you can add new items!";
    document.getElementById("adminLogin").style.display = "none";
    msg.textContent = "";
  } else {
    msg.textContent = "Your password is incorrect. Please, try again.";
    msg.style.color = "red";
  }
}

function toggleLoginForm() {
  const form = document.getElementById("adminLogin");
  form.style.display = form.style.display === "block" ? "none" : "block";
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("inventoryList")) viewInventory();
});
