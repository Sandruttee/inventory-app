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
  canvas.toBlob((blob) => {
    photoBlob = blob;

    const imgPreview = document.getElementById("photoPreview");
    imgPreview.src = URL.createObjectURL(blob);
    imgPreview.style.display = "block";
  }, "image/jpeg");

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

/**
 * Uploads a Blob to Imgur anonymously and returns the public URL.
 * @param {Blob} blob – the image blob from canvas.toBlob
 * @returns {Promise<string>} – the Imgur URL of the uploaded image
 */
async function uploadToImgur(blob) {
  const form = new FormData();
  form.append("image", blob);

  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.data?.error || `Imgur upload failed: HTTP ${res.status}`
    );
  }
  return json.data.link; // e.g. "https://i.imgur.com/abcd1234.jpg"
}
/**
 * Uploads a Blob to Imgur anonymously and returns its public URL.
 */
async function uploadToImgur(blob) {
  const form = new FormData();
  form.append("image", blob);

  const res = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}` },
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(
      json.data?.error || `Imgur upload failed: HTTP ${res.status}`
    );
  }
  return json.data.link; // e.g. "https://i.imgur.com/abcd1234.jpg"
}

/**
 * Adds a new inventory item:
 * 1) Creates a record in Airtable (no image)
 * 2) Uploads photoBlob to Imgur
 * 3) Patches the Airtable record's Image URL field
 * 4) Renders the result and cleans up
 */
async function addItem() {
  // 0) Grab & validate inputs
  const barcode = document.getElementById("adminBarcode").value.trim();
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value.trim();
  if (!barcode || !name || !price) {
    alert("Reikia užpildyti visus laukelius");
    return;
  }

  try {
    // 1) Create Airtable record (no image yet)
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
        },
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(createData.error?.message || `HTTP ${createRes.status}`);
    }

    // Grab the new record’s ID
    const recordId = Array.isArray(createData.records)
      ? createData.records[0].id
      : createData.id;

    let publicUrl = "";

    // 2) If a photo was captured, upload to Imgur
    if (photoBlob) {
      publicUrl = await uploadToImgur(photoBlob);

      // 3) PATCH the record’s Image URL field with the Imgur link
      const patchRes = await fetch(`${airtableURL}/${recordId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Image URL": publicUrl,
          },
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(
          patchData.error?.message || `Patch failed: ${patchRes.status}`
        );
      }
    }

    // 4) Render success UI (show the uploaded image)
    const resultDiv = document.getElementById("newItemDisplay");
    let html = `<h3>Prekė sėkmingai pridėta:</h3>
      <strong>Barkodas:</strong> ${barcode}<br>
      <strong>Prekės pavadinimas:</strong> ${name}<br>
      <strong>Kaina:</strong> $${parseFloat(price).toFixed(2)}<br>`;
    if (publicUrl) {
      html += `<img
        src="${publicUrl}"
        alt="Product image"
        style="max-width:100%;margin-top:10px;"
      />`;
    }
    resultDiv.innerHTML = html;

    // 5) Cleanup form/UI
    ["adminBarcode", "itemName", "itemPrice"].forEach(
      (id) => (document.getElementById(id).value = "")
    );
    photoBlob = null;
    document.getElementById("photoPreview").style.display = "none";
    document.getElementById("openCameraButton").style.display = "inline-block";
  } catch (err) {
    alert(`Įvyko klaida: ${err.message}`);
  }
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
      const detailsDiv = document.getElementById("resultDetails");
      const imgElem = document.getElementById("searchResultImage");

      if (data.records && data.records.length) {
        const item = data.records[0].fields;

        // render text details
        detailsDiv.innerHTML = `
          <strong>Barkodas:</strong> ${item.Barcode}<br>
          <strong>Prekės pavadinimas:</strong> ${item["Product name"]}<br>
          <strong>Prekės kaina:</strong> $${item.Price.toFixed(2)}<br>
        `;

        // render image if URL exists
        if (item["Image URL"]) {
          imgElem.src = item["Image URL"];
          imgElem.style.display = "block";
        } else {
          imgElem.style.display = "none";
        }
      } else {
        // no match
        detailsDiv.textContent = "Prekė nerasta";
        imgElem.style.display = "none";
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
      const container = document.getElementById("inventoryList");
      container.innerHTML = "";
      data.records.forEach((rec) => {
        const f = rec.fields;
        let html = `<div class="inventoryItem">
          <strong>Barkodas:</strong> ${f.Barcode}<br>
          <strong>Prekės pavadinimas:</strong> ${f["Product name"]}<br>
          <strong>Prekės kaina:</strong> $${f.Price.toFixed(2)}<br>`;
        if (f.Attachments && f.Attachments.length) {
          html += `<img src="${f.Attachments[0].url}" alt="Product image" style="max-width:100%;margin-top:10px;"/>`;
        }
        html += `</div>`;
        container.innerHTML += html;
      });
      if (!data.records.length) container.textContent = "Nėra jokių prekių.";
    })
    .catch((err) => {
      document.getElementById("inventoryList").textContent =
        "Klaida įkeliant prekes.";
      console.error(err);
    });
}

function checkAdminPassword() {
  const pwd = document.getElementById("adminPassword").value;
  const msg = document.getElementById("adminLoginMessage");
  if (pwd === "ananasas") {
    document.getElementById("adminSection").style.display = "block";
    document.getElementById("welcomeMessage").textContent =
      "Sveiki, Evaldai! Jūs sėkmingai prisijungėte ir galite pridėti naujas prekes!";
    document.getElementById("adminLogin").style.display = "none";
    msg.textContent = "";
  } else {
    msg.textContent = "Neteisingas slaptažodžius. Pabandykite dar kartą.";
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
