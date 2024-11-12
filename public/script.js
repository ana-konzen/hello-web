const numColumns = 2;
const sendElement = document.getElementById("send");
const imageInput = document.getElementById("imageInput");
const galleryCont = document.getElementById("gallery");
const loadingBuffer = document.getElementById("loading");
const infoCont = document.getElementById("imageInfo");

const artImg = document.getElementById("artImg");
const fileLabel = document.getElementById("fileLabel");
const leftCont = document.getElementById("leftCont");

let imageData = getDummyData();
document.body.style.backgroundColor = imageData.background_color[0];
leftCont.style.background = imageData.background_color[1];
fileLabel.style.color = imageData.background_color[1];
sendElement.style.color = imageData.background_color[1];

setArtistInfo();
createGallery();

imageInput.addEventListener("change", () => {
  if (imageInput.files.length === 0) {
    console.log("No image uploaded");
    fileLabel.style.background = "red";
    fileLabel.innerHTML = "error";
  } else {
    console.log("Image uploaded");
    fileLabel.style.background = "green";
    fileLabel.innerHTML = "uploaded";
  }
});

sendElement.addEventListener("click", async () => {
  galleryCont.innerHTML = "";
  infoCont.innerHTML = "";
  artImg.src = "";
  loadingBuffer.style.display = "block";

  if (imageInput.files.length === 0) {
    console.log("No image uploaded");
  } else {
    await sendImage();
  }
});

async function sendImage() {
  const reader = new FileReader();
  reader.readAsDataURL(imageInput.files[0]);
  reader.onload = async function () {
    try {
      const response = await fetch("/api/image", {
        method: "POST",
        body: JSON.stringify({ image: reader.result }),
      });
      imageData = await response.json();
      artImg.src = reader.result;
      document.body.style.backgroundColor = imageData.background_color[0];
      leftCont.style.background = imageData.background_color[1];
      fileLabel.style.color = imageData.background_color[1];
      sendElement.style.color = imageData.background_color[1];

      fileLabel.style.background = "black";
      fileLabel.innerHTML = "choose file";
      await setArtistInfo();
      await createGallery();
    } catch (error) {
      console.error(error);
    }
  };
}

async function setArtistInfo() {
  infoCont.innerHTML = `<p class="artist">${imageData.artist}</p>
      <p class="title">${imageData.title}</p>
      <p class="era">${imageData.era}</p>
      <p class="medium">${imageData.medium}</p>
      <p class="style">${imageData.style}</p>
      <p class="subject">${imageData.subject}</p>`;
}

async function getId(title) {
  const url = `https://api.artic.edu/api/v1/artworks/search?q=${title}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].id;
  } catch (error) {
    console.error(error.message);
  }
}

async function getArtInfo(id) {
  const url = `https://api.artic.edu/api/v1/artworks/${id}?fields=title,artist_title,date_display,medium_display,style_title,image_id`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const data = await response.json();
    const dataObj = {
      id: id,
      artist: data.data.artist_title,
      title: data.data.title,
      date: data.data.date_display,
      medium: data.data.medium_display,
      style: data.data.style_title,
      imageURL: `${data.config.iiif_url}/${data.data.image_id}/full/843,/0/default.jpg`,
    };
    return dataObj;
  } catch (error) {
    console.error(error.message);
  }
}

async function setImageData() {
  console.log("setting image data");
  const imagesData = [];

  for (const art of imageData.similar_artworks) {
    let id = await getId(art);
    const info = await getArtInfo(id);
    imagesData.push(info);
  }

  console.log(imagesData);
  const uniqueImagesData = imagesData.filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);
  return uniqueImagesData;
}

function createGrid() {
  const columns = [];
  for (let i = 0; i < numColumns; i++) {
    const col = document.createElement("div");
    col.classList.add("column");
    columns.push(col);
    galleryCont.appendChild(col);
  }

  return columns;
}

async function createGallery() {
  galleryCont.innerHTML = "";

  const infoArr = await setImageData();
  loadingBuffer.style.display = "none";
  const columns = createGrid();

  for (let i = 0; i < infoArr.length; i++) {
    const info = infoArr[i];
    const div = document.createElement("div");
    const caption = document.createElement("div");
    const artLink = `https://www.artic.edu/artworks/${info.id}`;
    div.classList.add("gallery-cont");
    caption.classList.add("caption");
    const image = document.createElement("img");
    image.src = info.imageURL;
    div.appendChild(image);
    if (info.title === null) {
      info.title = "Untitled";
    }
    if (info.artist === null) {
      info.artist = "Unknown";
    }
    if (info.date === null) {
      info.date = "n.d.";
    }
    caption.innerHTML += `<p class="artist">${info.artist}</p><p><span class="title">${info.title}</span><br>${info.date}</p><p><a href="${artLink}" target="_blank">→ original</a></p>`;
    div.appendChild(caption);
    columns[i % numColumns].appendChild(div);
  }
}

function getDummyData() {
  return {
    artist: "Claude Monet",
    title: "Impression, Sunrise",
    medium: "Oil on canvas",
    subject: "A hazy sunrise over a harbor with boats and distant industrial structures.",
    era: "19th century",
    style: "Impressionism",
    movement: "Impressionism",
    mood: ["calm", "dreamy", "contemplative"],
    similar_artists: [
      "Camille Pissarro",
      "Alfred Sisley",
      "Pierre-Auguste Renoir",
      "Berthe Morisot",
      "Gustave Caillebotte",
    ],
    similar_artworks: [
      "Water Lilies, Claude Monet",
      "Paris Street; Rainy Day, Gustave Caillebotte",
      "The Artist's Garden at Vétheuil, Claude Monet",
      "On the Terrace, Pierre-Auguste Renoir",
      "The Saint-Lazare Station, Claude Monet",
      "The Banks of the Seine, Alfred Sisley",
    ],
    background_color: ["#b0c3d1", "#f5d4c1"],
  };
}
