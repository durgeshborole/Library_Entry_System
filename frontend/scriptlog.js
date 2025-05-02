// document.addEventListener("DOMContentLoaded", () => {
//     const barcodeInput = document.getElementById("barcodeInput");
//     const visitorDetails = document.getElementById("visitorDetails");
//     const logTable = document.getElementById("logTable");
//     const statusMsg = document.createElement("p");
//     statusMsg.style.marginTop = "10px";
//     barcodeInput.insertAdjacentElement("afterend", statusMsg);
  
//     let barcode = "";
//     let typingTimer;
  
//     // Triggers on input and simulates a scanner with a delay
//     barcodeInput.addEventListener("input", () => {
//       clearTimeout(typingTimer);
//       barcode = barcodeInput.value.trim();
  
//       typingTimer = setTimeout(() => {
//         if (barcode) {
//           submitBarcode(barcode);
//           barcodeInput.value = "";
//           barcode = "";
//         }
//       }, 200);
//     });
  
//     // Sends barcode to backend and updates UI based on response
//     async function submitBarcode(barcode) {
//       try {
//         const response = await fetch("http://localhost:5000/scan", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ barcode }),
//         });
  
//         const data = await response.json();
  
//         if (data.error) {
//           statusMsg.textContent = data.error;
//           statusMsg.style.color = "red";
//         } else {
//           displayVisitor(data);
//           fetchLiveLog();
//           statusMsg.textContent = `${data.status === 'entry' ? '✅ Entry' : '🚪 Exit'} recorded for ${data.name}`;
//           statusMsg.style.color = "green";
//         }
//       } catch (err) {
//         console.error("Scan error:", err);
//         statusMsg.textContent = "Error connecting to server";
//         statusMsg.style.color = "red";
//       }
//     }
  
//     // Fetches current day's log from backend
//     async function fetchLiveLog() {
//       try {
//         const response = await fetch("http://localhost:5000/live-log");
//         const log = await response.json();
//         updateLiveLog(log);
//       } catch (err) {
//         console.error("Error fetching live log:", err);
//       }
//     }
  
//     // Displays visitor details in the UI
//     function displayVisitor(visitor) {
//       visitorDetails.innerHTML = `
//         <h2>Visitor Details</h2>
//         <p><strong> <img src="./images/mit-corer.png" alt="MITCORER Logo" class="mit-logo" /></strong> ${visitor.image}</p>
//         <p><strong>Name:</strong> ${visitor.name}</p>
//         <p><strong>Department:</strong> ${visitor.department}</p>
//         <p><strong>Year:</strong> ${visitor.year || "-"}</p>
//         <p><strong>Designation:</strong> ${visitor.designation}</p>
//       `;
//     }
  
//     // Updates the log table in the UI
//     function updateLiveLog(log) {
//       logTable.innerHTML = "";
//       log.forEach((entry) => {
//         const row = document.createElement("tr");
//         const duration = entry.exitTime ? ((new Date(entry.exitTime) - new Date(entry.entryTime)) / 1000).toFixed(0) : "-";
//         row.innerHTML = `
//           <td>${entry.name}</td>
//           <td>${entry.department}</td>
//           <td>${entry.year || "-"}</td>
//           <td>${entry.designation}</td>
//           <td>${formatDate(entry.entryTime)}</td>
//           <td>${entry.exitTime ? formatDate(entry.exitTime) : "-"}</td>
//           <td>${duration !== "-" ? duration + " sec" : "-"}</td>
//         `;
//         logTable.appendChild(row);
//       });
//     }
  
//     // Formats timestamps to local time
//     function formatDate(dateStr) {
//       const date = new Date(dateStr);
//       return date.toLocaleTimeString();
//     }
  
//     // Initial fetch when page loads
//     fetchLiveLog();
//   });
  

document.addEventListener("DOMContentLoaded", () => { 
  const barcodeInput = document.getElementById("barcodeInput");
  const visitorDetails = document.getElementById("visitorDetails");
  const logTable = document.getElementById("logTable");
  const statusMsg = document.createElement("p");
  statusMsg.style.marginTop = "10px";
  barcodeInput.insertAdjacentElement("afterend", statusMsg);

  let barcode = "";
  let typingTimer;

  // Triggers on input and simulates a scanner with a delay
  barcodeInput.addEventListener("input", () => {
    clearTimeout(typingTimer);
    barcode = barcodeInput.value.trim();

    typingTimer = setTimeout(() => {
      if (barcode) {
        submitBarcode(barcode);
        barcodeInput.value = "";
        barcode = "";
      }
    }, 200);
  });

  // Sends barcode to backend and updates UI based on response
  async function submitBarcode(barcode) {
    try {
      const response = await fetch("http://localhost:5000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      const data = await response.json();

      if (data.error) {
        statusMsg.textContent = data.error;
        statusMsg.style.color = "red";
      } else {
        displayVisitor(data);
        fetchLiveLog();
        statusMsg.textContent = `${data.status === 'entry' ? '✅ Entry' : '🚪 Exit'} recorded for ${data.name}`;
        statusMsg.style.color = "green";
      }
    } catch (err) {
      console.error("Scan error:", err);
      statusMsg.textContent = "Error connecting to server";
      statusMsg.style.color = "red";
    }
  }

  // Fetches current day's log from backend
  async function fetchLiveLog() {
    try {
      const response = await fetch("http://localhost:5000/live-log");
      const log = await response.json();
      updateLiveLog(log);
    } catch (err) {
      console.error("Error fetching live log:", err);
    }
  }

  // Displays visitor details including photo
  // function displayVisitor(visitor) {
  //   visitorDetails.innerHTML = `
  //     <h2>Visitor Details</h2>
  //     ${visitor.photoUrl ? `<img src="${visitor.photoUrl}" alt="Visitor Photo" class="visitor-photo" />` : ""}
  //     <p><strong>Name:</strong> ${visitor.name}</p>
  //     <p><strong>Department:</strong> ${visitor.department}</p>
  //     <p><strong>Year:</strong> ${visitor.year || "-"}</p>
  //     <p><strong>Designation:</strong> ${visitor.designation}</p>
  //   `;
  // }

  function displayVisitor(visitor) {
    const imageUrl = visitor.photoUrl || "/images/default.jpg"; // 👈 fallback image
  
    visitorDetails.innerHTML = `
      <h2>Visitor Details</h2>
      <div class="visitor-card">
        <div class="photo-side">
          <img src="${imageUrl}" alt="Visitor Photo" class="visitor-photo" />
        </div>
        <div class="info-side">
          <p><strong>Name:</strong> ${visitor.name}</p>
          <p><strong>Department:</strong> ${visitor.department}</p>
          <p><strong>Year:</strong> ${visitor.year || "-"}</p>
          <p><strong>Designation:</strong> ${visitor.designation}</p>
        </div>
      </div>
    `;
  }
  

  // Updates the log table in the UI
  function updateLiveLog(log) {
    logTable.innerHTML = "";
    log.forEach((entry) => {
      const row = document.createElement("tr");
      const duration = entry.exitTime ? ((new Date(entry.exitTime) - new Date(entry.entryTime)) / 1000).toFixed(0) : "-";
      row.innerHTML = `
        <td>${entry.name}</td>
        <td>${entry.department}</td>
        <td>${entry.year || "-"}</td>
        <td>${entry.designation}</td>
        <td>${formatDate(entry.entryTime)}</td>
        <td>${entry.exitTime ? formatDate(entry.exitTime) : "-"}</td>
        <td>${duration !== "-" ? duration + " sec" : "-"}</td>
      `;
      logTable.appendChild(row);
    });
  }

  // Formats timestamps to local time
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  }

  // Initial fetch when page loads
  fetchLiveLog();
});
