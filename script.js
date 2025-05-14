const AIRTABLE_TOKEN =
  "patZ6TKpBfRZ4No0E.39659757f007c4d9c89f698bf7583f4b4b2547b267e7560624345072a9afc4ff";
const AIRTABLE_BASE_ID = "appJUgj3fq2c2Wr7v";
const AIRTABLE_TABLE_NAME = "Table 1";

const airtableURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
  AIRTABLE_TABLE_NAME
)}`;

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

async function addItem() {
  // 0) grab & validate
  const barcode = document.getElementById("adminBarcode").value.trim();
  const name = document.getElementById("itemName").value.trim();
  const price = document.getElementById("itemPrice").value.trim();
  if (!barcode || !name || !price) {
    alert("Reikia užpildyti visus laukelius");
    return;
  }

  try {
    // 1) create record (no attachment)
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

    // normalize single vs. wrapped response
    const record = Array.isArray(createData.records)
      ? createData.records[0]
      : createData;
    const recordId = record.id;
    let attachments = record.fields?.Attachments || [];

    // 2) upload the blob (if any)
    if (photoBlob) {
      // 2a) send raw file to AttachmentUploads
      const uploadRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/AttachmentUploads`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          body: (() => {
            const f = new FormData();
            f.append("file", photoBlob, "photo.jpg");
            return f;
          })(),
        }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(
          uploadData.error?.message || `Upload failed: HTTP ${uploadRes.status}`
        );
      }

      // 2b) patch your record’s Attachments field with that upload ID
      const patchRes = await fetch(`${airtableURL}/${recordId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: { Attachments: [{ id: uploadData.id }] },
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) {
        throw new Error(
          patchData.error?.message || `Patch failed: HTTP ${patchRes.status}`
        );
      }
      attachments = patchData.records?.[0]?.fields?.Attachments || [];
    }

    // 3) render
    const resultDiv = document.getElementById("newItemDisplay");
    let html = `<h3>Prekė sėkmingai pridėta:</h3>
      <strong>Barkodas:</strong> ${barcode}<br>
      <strong>Prekės pavadinimas:</strong> ${name}<br>
      <strong>Kaina:</strong> $${parseFloat(price).toFixed(2)}<br>`;
    if (attachments.length) {
      html += `<img src="${attachments[0].url}"
                    alt="Product image"
                    style="max-width:100%;margin-top:10px;">`;
    }
    resultDiv.innerHTML = html;

    // 4) cleanup
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
  fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } })
    .then((res) => res.json())
    .then((data) => {
      const resultDiv = document.getElementById("result");
      if (data.records && data.records.length) {
        const item = data.records[0].fields;
        let html = `<strong>Barkodas:</strong> ${item.Barcode}<br>
          <strong>Prekės pavadinimas:</strong> ${item["Product name"]}<br>
          <strong>Prekės kaina:</strong> $${item.Price.toFixed(2)}<br>`;
        if (item.Attachments && item.Attachments.length) {
          html += `<img src="${item.Attachments[0].url}" alt="Product image" style="max-width:100%;margin-top:10px;"/>`;
        }
        resultDiv.innerHTML = html;
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
