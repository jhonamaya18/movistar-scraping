// NODE MODULES

require('dotenv').config(); 
const puppeteer = require("puppeteer-extra") // Scraping library
//const {TimeoutError} = require('puppeteer/Errors');
const fs = require ('fs') // Manage files from system
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
puppeteer.use(StealthPlugin({
  enabledEvasions: new Set(["chrome.app", "chrome.csi", "defaultArgs", "navigator.plugins"])
}))
const { Console } = require('console');
const TIMEOUT = parseInt(process.env.TIMEOUT);
const bluebird = require("bluebird");

function readData(rutaArchivo) {
    console.log('hola')
    try {
        // Leer el contenido del archivo
        const datos = fs.readFileSync(rutaArchivo, 'utf8');
        
        // Dividir el contenido en líneas y filtrar las vacías
        const lista = datos
            .split('\n') // Dividir por líneas
            .map(linea => linea.trim()) // Eliminar espacios en blanco alrededor
            .filter(linea => /^[0-9]{10}$/.test(linea)); // Filtrar solo números de 10 dígitos

        return lista;
    } catch (error) {
        console.error(`Error al leer el archivo: ${error.message}`);
        return [];
    }
}


//  sleepES5 function receives:
// - ms: miliseconds that the program need to sleep
var sleepES5 = function(ms){
    var esperarHasta = new Date().getTime() + ms;
    while(new Date().getTime() < esperarHasta) continue;
};


/////////////////////////////////////////////////////////////////////////////////
////////////////////////// Scraping functinos ///////////////////////////////////

async function scrapMovistar(browser,number,url,input,button,price){
    value = ''
    i=1
    while (i<3) {
        try {
            let page = await browser.newPage();
            await page.goto(url,{timeout: 0});
            await page.waitForSelector(input, {timeout: TIMEOUT});
            await page.click(input);
            await page.keyboard.type(number);
            await page.click(button);
            await page.waitForSelector(price, {timeout: TIMEOUT});
            let value = await page.$eval(price, element => element.innerHTML);
            i=3
            await page.close()
            return value.replace(/[^0-9]/g, '');
        } catch (error) {
            console.log(error);
            i++;
        }
        

    }
    await page.close()
    return 'Error';
    
}

async function scrapMovistarnew(page,number,url,input,button,price){
    await page.goto(url,{timeout: 3000000});
    await page.waitForSelector(input, {timeout: TIMEOUT});
    await page.click(input);
    await page.keyboard.type(number);
    await page.click(button);
    await page.waitForSelector(price, {timeout: TIMEOUT});
    let value = await page.$eval(price, element => element.innerHTML);
    i=3
    await page.close()
    return value.replace(/[^0-9]/g, '');
}

const withBrowser = async (fn) => {
	const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/google-chrome-stable',
        args: [ // neccesary to avoid automation mode of browser
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--allow-running-insecure-content',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--mute-audio',
            '--no-zygote',
            '--no-xshm',
            '--window-size=1920,1080',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--enable-webgl',
            '--ignore-certificate-errors',
            '--lang=en-US,en;q=0.9',
            '--password-store=basic',
            '--disable-gpu-sandbox',
            '--disable-software-rasterizer',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-infobars',
            '--disable-breakpad',
            '--disable-canvas-aa',
            '--disable-2d-canvas-clip-aa',
            '--disable-gl-drawing-for-tests',
            '--enable-low-end-device-mode',
            '--disable-extensions-except=./plugin',
            '--load-extension=./plugin',
            '--enable-popup-blocking',
            '--disable-site-isolation-trials'
        ]
     });
	try {
		return await fn(browser);
	} finally {
		await browser.close();
	}
}

const withPage = (browser) => async (fn) => {
	const page = await browser.newPage();
	try {
		return await fn(page);
	} finally {
		await page.close();
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////     MAIN FUNCTION     ///////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////

async function scrape() {
    
    let browser
    try {
        browser = await puppeteer.connect()
    } catch (error) {
        browser = await puppeteer.launch({
            //executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: true,
            //devtools: true,
            defaultViewport: { width: 1366, height: 768 },
            ignoreDefaultArgs: [ // neccesary to avoid automation mode of browser
                "--disable-extensions",
                "--enable-automation"
            ],
            args: [ // neccesary to avoid automation mode of browser
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--allow-running-insecure-content',
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--mute-audio',
                '--no-zygote',
                '--no-xshm',
                '--window-size=1920,1080',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--enable-webgl',
                '--ignore-certificate-errors',
                '--lang=en-US,en;q=0.9',
                '--password-store=basic',
                '--disable-gpu-sandbox',
                '--disable-software-rasterizer',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-infobars',
                '--disable-breakpad',
                '--disable-canvas-aa',
                '--disable-2d-canvas-clip-aa',
                '--disable-gl-drawing-for-tests',
                '--enable-low-end-device-mode',
                '--disable-extensions-except=./plugin',
                '--load-extension=./plugin',
                '--enable-popup-blocking',
                '--disable-site-isolation-trials'
            ]
        })
    }

   

    ///////////// START PAGES /////////////////
    const pLimit = (await import('p-limit')).default;
    
    console.log('beggining scraping');

    const rutaArchivo = 'numeros.txt'; 
    const numeros = readData(rutaArchivo);
    console.log(numeros);
    let content = "Numero\tFactura\n";
    
    const limit = pLimit(2); // Máximo 2 tareas simultáneas

    // Crear tareas limitadas
    const tasks = numeros.map(numero =>
        limit(() => scrapMovistar(browser, numero, process.env.URL_MOVISTAR, process.env.SEL_INPUT, process.env.SEL_BUTTON, process.env.SEL_FACTURA))
            .then(value => {
                content += `${numero}\t${value}\n`;
                console.log(`Número: ${numero}, Factura: ${value}`);
            })
    );

    // Esperar que todas las tareas terminen
    await Promise.all(tasks);


    // for (let i=0; i<numeros.length;i++){
    //     let value = await scrapMovistar(browser,numeros[i].toString(),process.env.URL_MOVISTAR,process.env.SEL_INPUT,process.env.SEL_BUTTON,process.env.SEL_FACTURA)
    //     content += `${numeros[i].toString()}\t${value}\n`;
    //     console.log(value)
    // }
    
    writeFileSync('resultados.txt', content);
    
}

async function scrapenew() {
    
    const rutaArchivo = 'numeros.txt'; 
    const numeros = readData(rutaArchivo);
    console.log(numeros);
    let content = "Numero\tFactura\n";
    
    const start = new Date();

    const results = await withBrowser(async (browser) => {
        return bluebird.map(numeros, async (numero) => {
            return withPage(browser)(async (page) => {
                
                let value = await scrapMovistarnew(page, numero, process.env.URL_MOVISTAR, process.env.SEL_INPUT, process.env.SEL_BUTTON, process.env.SEL_FACTURA)
                // run test code
                content += `${numero}\t${value}\n`;
                console.log(`Número: ${numero}, Factura: ${value}`);
                //return content;
            }).then((r) => ({result: r}), (e) => ({error: e}));
        }, {concurrency: 8});
    })

    console.log(content)

    const end = new Date();

    console.log(end.getTime() - start.getTime(), "ms");
    
    return content
}
// scrapenew()
module.exports = {
    scrapenew
}
