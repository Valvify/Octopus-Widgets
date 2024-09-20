// Scriptable Widget for Displaying Energy and Gas Tariff Information
// Adjusted for UK Daylight Saving Time
// Updated April 2024 - CS

const widget = new ListWidget(); // Initialize a new list widget
widget.backgroundColor = new Color("#100030"); // Set the background color of the widget

widget.addSpacer(4); // Add space at the top
const header = widget.addText("Tracker July 24 v1"); // Add header text
header.font = Font.boldSystemFont(10); // Set the font and size of the header
header.textColor = Color.white(); // Set the color of the header text
widget.addSpacer(4); // Add space below the header
var priceTracker;
var priceFlexible;
var trackerTomorrow;

//Check for BST
function isBST(date) {
    const marchLastSunday = new Date(date.getFullYear(), 2, 31);
    marchLastSunday.setDate(31 - (marchLastSunday.getDay() + 1) % 7);
    const octoberLastSunday = new Date(date.getFullYear(), 9, 31);
    octoberLastSunday.setDate(31 - (octoberLastSunday.getDay() + 1) % 7);

    return date > marchLastSunday && date < octoberLastSunday;
}

async function fetchTariffData(tariffType) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Calculate tomorrow's date by adding one day

    var productCode;
    if (tariffType === "tracker") {
        productCode = "SILVER-24-07-01"; // Yellow for electricity
    } else if (tariffType === "flex") {
        productCode = "VAR-22-11-01"; // Fiery orange for gas
    }
    
    const baseUrl = `https://api.octopus.energy/v1/products/${productCode}/`;
    const regionCode = "J"; // Change this to your region code: https://www.guylipman.com/octopus/formulas.html
    const tariffCode = `E-1R-${productCode}-${regionCode}`;
    console.log(tariffType[0].toUpperCase());

    // Helper function to format dates as YYYY-MM-DD
    function formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // During BST, adjust the period_to to 22:59:59 to account for UTC+1
    let periodToHour = isBST(today) ? "22:59:59" : "23:59:59";

    const urlToday = `${baseUrl}electricity-tariffs/${tariffCode}/standard-unit-rates/?period_from=${formatDate(today)}T00:00:00Z&period_to=${formatDate(today)}T${periodToHour}Z`;
    const urlTomorrow = `${baseUrl}electricity-tariffs/${tariffCode}/standard-unit-rates/?period_from=${formatDate(tomorrow)}T00:00:00Z&period_to=${formatDate(tomorrow)}T${periodToHour}Z`;


    let dataToday, dataTomorrow;
    try {
        let responseToday = await new Request(urlToday).loadJSON();
        dataToday = responseToday.results[0] ? responseToday.results[0].value_inc_vat.toFixed(2) : "N/A";
        let responseTomorrow = await new Request(urlTomorrow).loadJSON();
        dataTomorrow = responseTomorrow.results[0] ? responseTomorrow.results[0].value_inc_vat.toFixed(2) : "N/A";
    } catch (error) {
        console.error(`Error fetching tariff data: ${error}`);
        dataToday = "N/A";
        dataTomorrow = "N/A";
    }

    return { today: dataToday, tomorrow: dataTomorrow };
}

// Function to display the tariff data on the widget
async function displayTariffData(tariffType, symbolName) {
    const data = await fetchTariffData(tariffType); // Fetch the tariff data
    let row = widget.addStack(); // Create a new row in the widget
    row.centerAlignContent(); // Center-align the content in the row

    const symbol = SFSymbol.named(symbolName); // Get the SF Symbol for the tariff type
    symbol.applyMediumWeight(); // Apply medium weight to the symbol for better visibility
    const img = row.addImage(symbol.image); // Add the symbol image to the row
    
    // Set the symbol's color based on the tariff type
    if (tariffType === "tracker") {
        img.tintColor = new Color("#1b8c55"); // Yellow for electricity
        trackerTomorrow = data.tomorrow;
        priceTracker = data.today;
    } else if (tariffType === "flex") {
        img.tintColor = new Color("#FF4500"); // Fiery orange for gas
        priceFlexible = data.today;
    }
    
    img.imageSize = new Size(20, 20); // Set the size of the symbol image
    img.resizable = true; // Allow the symbol image to be resizable
    row.addSpacer(5); // Add space after the symbol

    // Display today's price in a large font
    let priceElement = row.addText(`${data.today}p`);
    priceElement.font = Font.boldSystemFont(26);
    priceElement.textColor = Color.white();

    if (tariffType === "flexible")
        widget.addSpacer(4); // Add space below today's price

    let subText, subElement;
    // Check if tomorrow's price is available and not "N/A"
    if (tariffType === "tracker") {
        if (data.tomorrow && data.tomorrow !== "N/A") {
            let change = data.today && data.today !== "N/A" ? ((parseFloat(data.tomorrow) - parseFloat(data.today)) / parseFloat(data.today)) * 100 : 0;
            // Calculate absolute change and format to 2 decimal places for percentage
            let percentageChange = Math.abs(change).toFixed(2) + "%"; 
            // Determine the arrow direction based on price change
            let arrow = change > 0 ? "↑" : (change < 0 ? "↓" : ""); 
            // Place the percentage change before the arrow in the display text
            subText = `${data.tomorrow}p (${percentageChange}${arrow})`; // Adjusted order here
            subElement = widget.addText(subText);
            // Color the text based on price change direction
            subElement.textColor = change > 0 ? new Color("#FF3B30") : (change < 0 ? new Color("#30D158") : Color.white());
            subElement.font = Font.systemFont(11);
        } else {
            // Display "Coming Soon" if tomorrow's price is not available
            subText = `Coming Soon`;
            subElement = widget.addText(subText);
            subElement.textColor = Color.white();
            subElement.font = Font.systemFont(11);
        }
    }
}

// Display tariff information for electricity and gas
await displayTariffData("tracker", "bolt.fill");
widget.addSpacer(7); // Add final spacer for layout
let flexText = widget.addText("Flexible")
widget.addSpacer(1); // Add space below the header
flexText.textColor = Color.white(); // Set the color of the header text
flexText.font = Font.boldSystemFont(10);
await displayTariffData("flex", "arrowshape.turn.up.left.circle");
if (priceFlexible && priceTracker && priceFlexible !== "N/A" && priceTracker !== "N/A") {
            let change = priceTracker !== "N/A" ? ((parseFloat(priceTracker) - parseFloat(priceFlexible)) / parseFloat(priceFlexible)) * 100 : 0;
            let changeTomorrow = trackerTomorrow !== "N/A" ? ((parseFloat(trackerTomorrow) - parseFloat(priceFlexible)) / parseFloat(priceFlexible)) * 100 : 0;
            // Calculate absolute change and format to 2 decimal places for percentage
            let percentageChange = Math.abs(change).toFixed(2) + "%";
            let percentageChangeTomorrow = Math.abs(changeTomorrow).toFixed(2) + "%";
            // Determine the arrow direction based on price change
            let arrow = change > 0 ? "↑" : (change < 0 ? "↓" : ""); 
            let arrowTomorrow = changeTomorrow > 0 ? "↑" : (changeTomorrow < 0 ? "↓" : ""); 
            // Place the percentage change before the arrow in the display text

//             let subTextLeft = `${percentageChange}${arrow} | ${percentageChangeTomorrow}${arrowTomorrow}`;
            
            const subText = widget.addStack();
            let subTextLeft = `${percentageChange}${arrow}`; // Adjusted order here
            let subElementLeft = subText.addText(subTextLeft)
            subElementLeft.textColor = change > 0 ? new Color("#FF3B30") : (change < 0 ? new Color("#30D158") : Color.white());
            subElementLeft.font = Font.systemFont(11);
            
            let subTextMid = ` | `; // Adjusted order here
            let subElementMid = subText.addText(subTextMid)
            subElementMid.font = Font.systemFont(11);
            
            let subTextRight = `${percentageChangeTomorrow}${arrowTomorrow}`; // Adjusted order here
            let subElementRight = subText.addText(subTextRight)
            subElementRight.textColor = changeTomorrow > 0 ? new Color("#FF3B30") : (changeTomorrow < 0 ? new Color("#30D158") : Color.white());
            subElementRight.font = Font.systemFont(11);
            
//             subElement.textColor = new Color("#888888")
//             subElement.textColor = change > 0 ? new Color("#FF3B30") : (change < 0 ? new Color("#30D158") : Color.white());
        }


// Optional: Set the widget's URL to open a specific app or webpage
widget.url = "https://octopustracker.small3y.co.uk";

// Preview the widget in the app if not running in a widget context
if (!config.runsInWidget) {
    await widget.presentSmall();
}

Script.setWidget(widget); // Set the widget for display
Script.complete(); // Signal that the script has completed execution
