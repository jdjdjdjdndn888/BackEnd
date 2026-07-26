// ============================================
// COMPLETE SAB PET BOT - SINGLE FILE
// ============================================
// FILL IN YOUR CONFIGURATION BELOW
// ============================================

const CONFIG = {
  // Discord Bot Configuration
  discordToken: "YOUR_DISCORD_BOT_TOKEN_HERE",
  clientId: "YOUR_DISCORD_CLIENT_ID_HERE",
  guildId: "YOUR_DISCORD_GUILD_ID_HERE",

  // Backend Configuration
  jwt: "YOUR_JWT_TOKEN_HERE",
  backend: "https://your-backend-url.com",

  // Bot Settings
  maxImagesPerBatch: 10,
  imageTimeout: 120000,
  maxFileSize: 10485760, // 10MB
  supportedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif']
};

// ============================================
// DEPENDENCIES
// ============================================

const {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  REST,
  Routes,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');

const sharp = require('sharp');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// ============================================
// LOGGER
// ============================================

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.logFile = path.join(this.logDir, `bot_${new Date().toISOString().split('T')[0]}.log`);
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    try {
      fs.appendFileSync(this.logFile, logMessage + '\n');
    } catch (e) {}
  }

  info(message) { this.log(message, 'INFO'); }
  warn(message) { this.log(message, 'WARN'); }
  error(message) { this.log(message, 'ERROR'); }
  debug(message) { this.log(message, 'DEBUG'); }
}

const logger = new Logger();

// ============================================
// VALIDATOR
// ============================================

class Validator {
  isValidImage(file) {
    if (!file) return false;
    const ext = file.name ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (!CONFIG.supportedExtensions.includes(ext)) return false;
    if (file.size > CONFIG.maxFileSize) return false;
    return true;
  }

  isValidPetName(name) {
    if (!name || typeof name !== 'string') return false;
    const cleaned = name.trim();
    if (cleaned.length < 2 || cleaned.length > 50) return false;
    const invalidChars = /[{}()<>|\\/;'"`]/;
    if (invalidChars.test(cleaned)) return false;
    return true;
  }

  isValidIncome(income) {
    if (!income || typeof income !== 'string') return false;
    const pattern = /^(\d+\.?\d*)[mM]\/[sS]$/;
    if (!pattern.test(income)) return false;
    const value = parseFloat(income);
    return value > 0 && value < 1000000;
  }

  isValidCategory(category) {
    return category === 'SAB';
  }
}

const validator = new Validator();

// ============================================
// BACKEND SERVICE
// ============================================

class BackendService {
  constructor() {
    this.baseURL = CONFIG.backend;
    this.jwt = CONFIG.jwt;
    this.headers = {
      'Authorization': `Bearer ${this.jwt}`,
      'Content-Type': 'application/json'
    };
  }

  async checkPetExists(name) {
    try {
      const response = await axios.get(`${this.baseURL}/api/items/exists`, {
        params: { name, category: 'SAB' },
        headers: this.headers,
        timeout: 10000
      });
      return response.data.exists || false;
    } catch (error) {
      logger.error(`Check pet error: ${error.message}`);
      return false;
    }
  }

  async createPet(petData) {
    logger.info(`Creating pet: ${petData.name}`);
    const payload = {
      name: petData.name,
      category: 'SAB',
      income: petData.income,
      mutations: petData.mutations || [],
      game: 'PS99'
    };

    try {
      const response = await axios.post(`${this.baseURL}/api/items`, payload, {
        headers: this.headers,
        timeout: 15000
      });
      logger.info(`Created pet: ${petData.name}`);
      return response.data;
    } catch (error) {
      logger.error(`Create pet error: ${error.response?.data?.message || error.message}`);
      throw new Error(`Failed to create pet: ${error.response?.data?.message || error.message}`);
    }
  }

  async uploadImage(imagePath, petName) {
    logger.info(`Uploading image for: ${petName}`);
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('name', petName);
    formData.append('category', 'SAB');

    try {
      const response = await axios.post(`${this.baseURL}/api/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${this.jwt}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });
      logger.info(`Uploaded image: ${petName}`);
      return response.data;
    } catch (error) {
      logger.error(`Upload image error: ${error.response?.data?.message || error.message}`);
      throw new Error(`Failed to upload image: ${error.response?.data?.message || error.message}`);
    }
  }

  async createPetWithImage(imagePath, petData) {
    const exists = await this.checkPetExists(petData.name);
    if (exists) {
      logger.warn(`Pet already exists: ${petData.name}`);
      throw new Error('Pet already exists');
    }
    const pet = await this.createPet(petData);
    await this.uploadImage(imagePath, petData.name);
    return pet;
  }
}

// ============================================
// OCR SERVICE
// ============================================

class OCRService {
  constructor() {
    this.worker = null;
  }

  async initialize() {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
    }
    return this.worker;
  }

  async extractText(imagePath) {
    try {
      const worker = await this.initialize();
      const result = await worker.recognize(imagePath);
      return result.data.text;
    } catch (error) {
      logger.error(`OCR error: ${error.message}`);
      return '';
    }
  }

  async extractPetName(imagePath) {
    const text = await this.extractText(imagePath);
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    for (const line of lines) {
      const clean = line.trim();
      if (clean.length > 1 && clean.length < 30) {
        const hasInvalidChars = /[{}()<>|\\/]/.test(clean);
        if (!hasInvalidChars && !this.isCurrencyLine(clean)) {
          return clean;
        }
      }
    }
    return lines.length > 0 ? lines[0].trim() : 'Unknown Pet';
  }

  async extractIncome(imagePath) {
    const text = await this.extractText(imagePath);
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const patterns = [
      /(\d+\.?\d*)\s*[mM]\s*\/\s*[sS]/,
      /(\d+\.?\d*)[mM]\/[sS]/,
      /(\d+\.?\d*)\s*[mM]\s*per\s*[sS]/
    ];
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const value = parseFloat(match[1]);
          if (value > 0) return `${value}M/s`;
        }
      }
    }
    return '0M/s';
  }

  isCurrencyLine(text) {
    const patterns = [/[mM]\/[sS]/, /[dD]iamond/, /[eE]merald/, /[bB]ubblegum/, /[iI]nfernal/];
    for (const pattern of patterns) {
      if (pattern.test(text)) return true;
    }
    return false;
  }

  async extractMutations(imagePath) {
    const text = await this.extractText(imagePath);
    const mutations = [];
    const patterns = [
      {pattern: /[dD]iamond/, name: 'Diamond'},
      {pattern: /[eE]merald/, name: 'Emerald'},
      {pattern: /[bB]ubblegum/, name: 'Bubblegum'},
      {pattern: /[iI]nfernal/, name: 'Infernal'}
    ];
    for (const {pattern, name} of patterns) {
      if (pattern.test(text)) mutations.push(name);
    }
    return mutations;
  }

  async cleanup() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// ============================================
// IMAGE SERVICE
// ============================================

class ImageService {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async createTransparentPNG(inputPath, outputPath) {
    await sharp(inputPath)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true
      })
      .toFile(outputPath);
    return outputPath;
  }

  async removeBackground(imagePath) {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const bgColor = this.detectBackgroundColor(data, canvas.width, canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (this.isBackgroundColor(r, g, b, bgColor)) {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const outputPath = path.join(this.tempDir, `transparent_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }

  detectBackgroundColor(data, width, height) {
    const corners = [
      {x: 0, y: 0}, {x: width - 1, y: 0},
      {x: 0, y: height - 1}, {x: width - 1, y: height - 1}
    ];
    const colors = [];
    for (const corner of corners) {
      const idx = (corner.y * width + corner.x) * 4;
      colors.push({r: data[idx], g: data[idx + 1], b: data[idx + 2]});
    }
    return {
      r: colors.reduce((sum, c) => sum + c.r, 0) / colors.length,
      g: colors.reduce((sum, c) => sum + c.g, 0) / colors.length,
      b: colors.reduce((sum, c) => sum + c.b, 0) / colors.length
    };
  }

  isBackgroundColor(r, g, b, bgColor, threshold = 30) {
    return Math.abs(r - bgColor.r) < threshold &&
           Math.abs(g - bgColor.g) < threshold &&
           Math.abs(b - bgColor.b) < threshold;
  }

  cleanup() {
    const files = fs.readdirSync(this.tempDir);
    for (const file of files) {
      if (file.startsWith('transparent_') || file.startsWith('pet_') || 
          file.startsWith('cropped_') || file.startsWith('processed_') ||
          file.startsWith('temp_') || file.startsWith('name_') ||
          file.startsWith('income_') || file.startsWith('mutation_')) {
        const filePath = path.join(this.tempDir, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
  }
}

// ============================================
// DETECTOR
// ============================================

class Detector {
  constructor() {
    this.minPetWidth = 80;
    this.minPetHeight = 80;
    this.maxPetWidth = 300;
    this.maxPetHeight = 300;
    this.imageService = new ImageService();
  }

  async detectPets(imagePath) {
    logger.info('Processing screenshot...');
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;
    const petRegions = this.findPetRegions(data, image.width, image.height);
    logger.info(`Found ${petRegions.length} potential pet(s)`);
    const pets = [];
    for (let i = 0; i < petRegions.length; i++) {
      const region = petRegions[i];
      const croppedPath = path.join(__dirname, 'temp', `cropped_${Date.now()}_${i}.png`);
      await sharp(imagePath)
        .extract({left: region.x, top: region.y, width: region.width, height: region.height})
        .toFile(croppedPath);
      pets.push({x: region.x, y: region.y, width: region.width, height: region.height, croppedPath});
    }
    return pets;
  }

  findPetRegions(data, width, height) {
    const regions = [];
    const visited = new Set();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (this.isPetPixel(data[idx], data[idx + 1], data[idx + 2]) && !visited.has(`${x},${y}`)) {
          const region = this.floodFill(data, width, height, x, y, visited);
          if (region.width >= this.minPetWidth && region.height >= this.minPetHeight &&
              region.width <= this.maxPetWidth && region.height <= this.maxPetHeight) {
            regions.push(this.expandRegion(region, 10));
          }
        }
      }
    }
    return this.mergeOverlappingRegions(regions);
  }

  isPetPixel(r, g, b) {
    const brightness = (r + g + b) / 3;
    const isColored = Math.abs(r - g) > 20 || Math.abs(g - b) > 20 || Math.abs(r - b) > 20;
    return brightness > 30 && brightness < 230 && isColored;
  }

  floodFill(data, width, height, startX, startY, visited) {
    const queue = [{x: startX, y: startY}];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const visitedSet = new Set([`${startX},${startY}`]);
    while (queue.length > 0) {
      const {x, y} = queue.shift();
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      const neighbors = [{dx: -1, dy: 0}, {dx: 1, dy: 0}, {dx: 0, dy: -1}, {dx: 0, dy: 1}];
      for (const {dx, dy} of neighbors) {
        const nx = x + dx, ny = y + dy;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visitedSet.has(key)) {
          const idx = (ny * width + nx) * 4;
          if (this.isPetPixel(data[idx], data[idx + 1], data[idx + 2])) {
            visitedSet.add(key);
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
    for (const key of visitedSet) visited.add(key);
    return {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1};
  }

  expandRegion(region, padding) {
    return {x: Math.max(0, region.x - padding), y: Math.max(0, region.y - padding),
            width: region.width + padding * 2, height: region.height + padding * 2};
  }

  mergeOverlappingRegions(regions) {
    if (regions.length === 0) return [];
    const merged = [];
    const sorted = [...regions].sort((a, b) => a.x - b.x);
    let current = {...sorted[0]};
    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      if (this.regionsOverlap(current, next)) {
        current.x = Math.min(current.x, next.x);
        current.y = Math.min(current.y, next.y);
        current.width = Math.max(current.x + current.width, next.x + next.width) - current.x;
        current.height = Math.max(current.y + current.height, next.y + next.height) - current.y;
      } else {
        merged.push({...current});
        current = {...next};
      }
    }
    merged.push({...current});
    return merged;
  }

  regionsOverlap(a, b) {
    const horizontalOverlap = a.x < b.x + b.width && b.x < a.x + a.width;
    const verticalOverlap = a.y < b.y + b.height && b.y < a.y + a.height;
    const overlapArea = (Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
                       (Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const minArea = Math.min(a.width * a.height, b.width * b.height);
    return horizontalOverlap && verticalOverlap && (overlapArea / minArea) > 0.1;
  }
}

// ============================================
// PARSER
// ============================================

class Parser {
  constructor() {
    this.ocr = new OCRService();
  }

  async parsePet(petData) {
    logger.info('Parsing pet data...');
    const croppedPath = petData.croppedPath;
    const namePath = path.join(__dirname, 'temp', `name_${Date.now()}.png`);
    const incomePath = path.join(__dirname, 'temp', `income_${Date.now()}.png`);
    const mutationPath = path.join(__dirname, 'temp', `mutation_${Date.now()}.png`);

    try {
      await this.prepareOCRImages(croppedPath, namePath, incomePath, mutationPath);
      const [name, income, mutations] = await Promise.all([
        this.ocr.extractPetName(namePath),
        this.ocr.extractIncome(incomePath),
        this.ocr.extractMutations(mutationPath)
      ]);
      const title = this.buildTitle(name, mutations);
      const result = {name: title, income, mutations, originalName: name};
      [namePath, incomePath, mutationPath].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      logger.info(`Parsed: ${title} (${income})`);
      return result;
    } catch (error) {
      logger.error(`Parse error: ${error.message}`);
      [namePath, incomePath, mutationPath].forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
      return {name: 'Unknown Pet', income: '0M/s', mutations: [], originalName: 'Unknown'};
    }
  }

  async prepareOCRImages(croppedPath, namePath, incomePath, mutationPath) {
    const metadata = await sharp(croppedPath).metadata();
    const w = metadata.width, h = metadata.height;
    await sharp(croppedPath).extract({left: Math.floor(w * 0.05), top: Math.floor(h * 0.7),
      width: Math.floor(w * 0.6), height: Math.floor(h * 0.15)}).toFile(namePath);
    await sharp(croppedPath).extract({left: Math.floor(w * 0.05), top: Math.floor(h * 0.85),
      width: Math.floor(w * 0.4), height: Math.floor(h * 0.12)}).toFile(incomePath);
    await sharp(croppedPath).extract({left: Math.floor(w * 0.7), top: Math.floor(h * 0.7),
      width: Math.floor(w * 0.25), height: Math.floor(h * 0.25)}).toFile(mutationPath);
  }

  buildTitle(name, mutations) {
    if (!mutations || mutations.length === 0) return name;
    return `${mutations.join(' • ')} — ${name}`;
  }

  async cleanup() {
    await this.ocr.cleanup();
  }
}

// ============================================
// UPLOADER
// ============================================

class Uploader {
  constructor() {
    this.backend = new BackendService();
    this.imageService = new ImageService();
  }

  async createTransparentPNG(inputPath, outputPath) {
    return this.imageService.createTransparentPNG(inputPath, outputPath);
  }

  async uploadToBackend(imagePath, petData) {
    logger.info(`Uploading ${petData.name}...`);
    const processedPath = path.join(__dirname, 'temp', `processed_${Date.now()}.png`);
    await this.createTransparentPNG(imagePath, processedPath);
    try {
      const result = await this.backend.createPetWithImage(processedPath, petData);
      if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
      logger.info(`Uploaded ${petData.name}`);
      return result;
    } catch (error) {
      if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
      throw error;
    }
  }

  async uploadMultiple(pets) {
    logger.info(`Uploading ${pets.length} pet(s)...`);
    const results = [];
    const processedNames = new Set();
    for (const pet of pets) {
      if (processedNames.has(pet.name.toLowerCase())) {
        results.push({name: pet.name, status: 'skipped', reason: 'Duplicate pet'});
        continue;
      }
      processedNames.add(pet.name.toLowerCase());
      try {
        const result = await this.uploadToBackend(pet.imagePath, pet);
        results.push({name: pet.name, status: 'success', data: result});
      } catch (error) {
        results.push({name: pet.name, status: 'failed', reason: error.message});
      }
    }
    logger.info(`Upload complete: ${results.filter(r => r.status === 'success').length} success, ${results.filter(r => r.status === 'failed').length} failed, ${results.filter(r => r.status === 'skipped').length} skipped`);
    return results;
  }
}

// ============================================
// DISCORD BOT
// ============================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// ============================================
// COMMAND: /addpet
// ============================================

const addpetCommand = {
  data: new SlashCommandBuilder()
    .setName('addpet')
    .setDescription('Add a single SAB pet from a screenshot'),

  async execute(interaction) {
    await interaction.reply({content: '📸 Please upload your pet screenshot. You have 60 seconds.', ephemeral: true});

    try {
      const filter = msg => msg.author.id === interaction.user.id && msg.attachments.size > 0;
      const collected = await interaction.channel.awaitMessages({filter, max: 1, time: 60000, errors: ['time']});
      const message = collected.first();
      const attachment = message.attachments.first();

      if (!attachment) {
        await interaction.editReply({content: '❌ No image found. Command cancelled.', ephemeral: true});
        return;
      }

      await interaction.editReply({content: '🔄 Processing screenshot...', ephemeral: true});

      const imagePath = path.join(__dirname, 'temp', `temp_${Date.now()}.png`);
      const response = await fetch(attachment.url);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(imagePath, Buffer.from(buffer));

      const detector = new Detector();
      const pets = await detector.detectPets(imagePath);

      if (pets.length === 0) {
        fs.unlinkSync(imagePath);
        await interaction.editReply({content: '❌ No pets detected in the image.', ephemeral: true});
        return;
      }

      await interaction.editReply({content: `✅ Found ${pets.length} pet(s). Processing...`, ephemeral: true});

      const parser = new Parser();
      const uploader = new Uploader();
      const results = [];
      const processedNames = new Set();

      for (let i = 0; i < pets.length; i++) {
        const pet = pets[i];
        const petData = await parser.parsePet(pet);

        if (processedNames.has(petData.name.toLowerCase())) {
          results.push({name: petData.name, status: 'skipped', reason: 'Duplicate pet'});
          if (fs.existsSync(pet.croppedPath)) fs.unlinkSync(pet.croppedPath);
          continue;
        }

        processedNames.add(petData.name.toLowerCase());
        const pngPath = path.join(__dirname, 'temp', `pet_${Date.now()}_${i}.png`);
        await uploader.createTransparentPNG(pet.croppedPath, pngPath);

        try {
          const uploaded = await uploader.uploadToBackend(pngPath, petData);
          results.push({name: petData.name, status: 'success', data: uploaded});
          if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
        } catch (error) {
          results.push({name: petData.name, status: 'failed', reason: error.message});
          if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
        }

        if (fs.existsSync(pet.croppedPath)) fs.unlinkSync(pet.croppedPath);
      }

      fs.unlinkSync(imagePath);
      await parser.cleanup();

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📊 Pet Processing Complete')
        .setDescription(`Processed ${results.length} pet(s)`)
        .setTimestamp();

      const successCount = results.filter(r => r.status === 'success').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      let details = '';
      for (const result of results) {
        const emoji = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
        details += `${emoji} **${result.name}**`;
        if (result.status === 'skipped') details += ` (${result.reason})`;
        if (result.status === 'failed') details += ` (${result.reason})`;
        details += '\n';
      }

      embed.addFields(
        {name: '✅ Success', value: `${successCount}`, inline: true},
        {name: '⏭️ Skipped', value: `${skippedCount}`, inline: true},
        {name: '❌ Failed', value: `${failedCount}`, inline: true},
        {name: 'Details', value: details || 'No details available', inline: false}
      );

      await interaction.editReply({content: '✅ Processing complete!', embeds: [embed], ephemeral: true});

    } catch (error) {
      logger.error(`Addpet error: ${error.message}`);
      await interaction.editReply({content: `❌ Error: ${error.message}`, ephemeral: true});
    }
  }
};

// ============================================
// COMMAND: /addpets
// ============================================

const addpetsCommand = {
  data: new SlashCommandBuilder()
    .setName('addpets')
    .setDescription('Add multiple SAB pets from screenshots'),

  async execute(interaction) {
    await interaction.reply({content: '📸 Please upload your pet screenshots (up to 10). You have 120 seconds.', ephemeral: true});

    try {
      const filter = msg => msg.author.id === interaction.user.id && msg.attachments.size > 0;
      const collected = await interaction.channel.awaitMessages({filter, max: 10, time: 120000, errors: ['time']});

      const allAttachments = [];
      for (const msg of collected.values()) {
        for (const [key, attachment] of msg.attachments) {
          allAttachments.push(attachment);
        }
      }

      if (allAttachments.length === 0) {
        await interaction.editReply({content: '❌ No images found. Command cancelled.', ephemeral: true});
        return;
      }

      await interaction.editReply({content: `🔄 Processing ${allAttachments.length} screenshot(s)...`, ephemeral: true});

      const detector = new Detector();
      const parser = new Parser();
      const uploader = new Uploader();

      const allPets = [];
      const processedNames = new Set();
      const tempFiles = [];

      for (let i = 0; i < allAttachments.length; i++) {
        const attachment = allAttachments[i];
        const imagePath = path.join(__dirname, 'temp', `temp_${Date.now()}_${i}.png`);
        tempFiles.push(imagePath);
        const response = await fetch(attachment.url);
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(imagePath, Buffer.from(buffer));
        const pets = await detector.detectPets(imagePath);
        allPets.push(...pets);
      }

      await interaction.editReply({content: `✅ Found ${allPets.length} pet(s). Processing...`, ephemeral: true});

      const results = [];

      for (let i = 0; i < allPets.length; i++) {
        const pet = allPets[i];
        const petData = await parser.parsePet(pet);

        if (processedNames.has(petData.name.toLowerCase())) {
          results.push({name: petData.name, status: 'skipped', reason: 'Duplicate pet'});
          if (fs.existsSync(pet.croppedPath)) fs.unlinkSync(pet.croppedPath);
          continue;
        }

        processedNames.add(petData.name.toLowerCase());
        const pngPath = path.join(__dirname, 'temp', `pet_${Date.now()}_${i}.png`);
        tempFiles.push(pngPath);
        await uploader.createTransparentPNG(pet.croppedPath, pngPath);

        try {
          const uploaded = await uploader.uploadToBackend(pngPath, petData);
          results.push({name: petData.name, status: 'success', data: uploaded});
        } catch (error) {
          results.push({name: petData.name, status: 'failed', reason: error.message});
        }

        if (fs.existsSync(pet.croppedPath)) fs.unlinkSync(pet.croppedPath);
      }

      for (const file of tempFiles) {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }

      await parser.cleanup();

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📊 Batch Pet Processing Complete')
        .setDescription(`Processed ${results.length} pet(s) from ${allAttachments.length} screenshot(s)`)
        .setTimestamp();

      const successCount = results.filter(r => r.status === 'success').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      let details = '';
      for (const result of results) {
        const emoji = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
        details += `${emoji} **${result.name}**`;
        if (result.status === 'skipped') details += ` (${result.reason})`;
        if (result.status === 'failed') details += ` (${result.reason})`;
        details += '\n';
      }

      embed.addFields(
        {name: '✅ Success', value: `${successCount}`, inline: true},
        {name: '⏭️ Skipped', value: `${skippedCount}`, inline: true},
        {name: '❌ Failed', value: `${failedCount}`, inline: true},
        {name: 'Details', value: details || 'No details available', inline: false}
      );

      await interaction.editReply({content: '✅ Batch processing complete!', embeds: [embed], ephemeral: true});

    } catch (error) {
      logger.error(`Addpets error: ${error.message}`);
      await interaction.editReply({content: `❌ Error: ${error.message}`, ephemeral: true});
    }
  }
};

// ============================================
// REGISTER COMMANDS
// ============================================

client.commands.set(addpetCommand.data.name, addpetCommand);
client.commands.set(addpetsCommand.data.name, addpetsCommand);

const commands = [addpetCommand.data.toJSON(), addpetsCommand.data.toJSON()];

// ============================================
// CLIENT READY
// ============================================

client.once(Events.ClientReady, async () => {
  logger.info(`Logged in as ${client.user.tag}`);
  logger.info(`Loaded ${commands.length} commands`);

  try {
    const rest = new REST({ version: '10' }).setToken(CONFIG.discordToken);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    logger.info('Registered slash commands globally');
  } catch (error) {
    logger.error(`Failed to register commands: ${error.message}`);
  }
});

// ============================================
// INTERACTION HANDLER
// ============================================

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Command error: ${error.message}`);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ Error')
      .setDescription('An error occurred while executing this command.')
      .setTimestamp();
    await interaction.reply({embeds: [errorEmbed], ephemeral: true});
  }
});

// ============================================
// CLEANUP ON EXIT
// ============================================

process.on('exit', () => {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      try { fs.unlinkSync(path.join(tempDir, file)); } catch (e) {}
    }
  }
  logger.info('Bot shutting down...');
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

// ============================================
// START THE BOT
// ============================================

if (!CONFIG.discordToken || CONFIG.discordToken === "YOUR_DISCORD_BOT_TOKEN_HERE") {
  console.error('❌ ERROR: Please configure your Discord token in CONFIG at the top of this file!');
  process.exit(1);
}

if (!CONFIG.jwt || CONFIG.jwt === "YOUR_JWT_TOKEN_HERE") {
  console.error('❌ ERROR: Please configure your JWT token in CONFIG at the top of this file!');
  process.exit(1);
}

if (!CONFIG.backend || CONFIG.backend === "https://your-backend-url.com") {
  console.error('❌ ERROR: Please configure your backend URL in CONFIG at the top of this file!');
  process.exit(1);
}

logger.info('Starting SAB Pet Bot...');
client.login(CONFIG.discordToken);

// ============================================
// END OF FILE
// ============================================