
const container = document.getElementById("imageContainer");
const img1 = document.getElementById("image1");
const img2 = document.getElementById("image2");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");

let correspondingBodyPixel, allBodyPixel;
let leftUpperArmFront;
let leftLowerArmFront, rightLowerArmFront;
let height, size, width;
let totalHeight, totalWidth;
let imgWidth = imgHeight = 1000

const left_face = 0;
const right_face = 1;
const left_upper_arm_front = 2;
const left_upper_arm_back = 3;
const right_upper_arm_front = 4;
const right_upper_arm_back = 5;
const left_lower_arm_front = 6;
const left_lower_arm_back = 7;
const right_lower_arm_front = 8;
const right_lower_arm_back = 9;
const left_hand = 10;
const right_hand = 11;
const torso_front = 12;
const torso_back = 13;
const left_upper_leg_front = 14;
const left_upper_leg_back = 15;
const right_upper_leg_front = 16;
const right_upper_leg_back = 17;
const left_lower_leg_front = 18;
const left_lower_leg_back = 19;
const right_lower_leg_front = 20;
const right_lower_leg_back = 21;
const left_foot = 22;
const right_foot = 23;

const drawLine = a => b => ctx => {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
};

const drawCircle = coords => r => ctx => {
    ctx.beginPath();
    ctx.arc(...coords, r, 0, 2 * Math.PI);
    ctx.fill();
};

const drawRect = pointA => pointB => ctx => {
    ctx.beginPath();
    ctx.rect(...pointA, ...pointB);
    ctx.stroke();
}

const withCanvasProp = ctx => prop => value => fn => {
    ctx[prop] = value;
    return fn;
}

const withStrokeStyle = ctx => value =>
    withCanvasProp (ctx) ("strokeStyle") (value)

const withFillStyle = ctx => value =>
    withCanvasProp (ctx) ("fillStyle") (value)

const withResettingStrokeStyle = ctx => value => fn => (...args) => {
    const oldStrokeStyle = ctx["strokeStyle"];
    const result = withStrokeStyle (ctx) (value) (fn) (...args)

    /* Reset strokeStyle to old saved strokeStyle */
    withStrokeStyle (ctx) (oldStrokeStyle) (() => {}) ()

    return result;
}

const withContext = canvas => fn =>
    fn(canvas.getContext("2d"))

async function loadAndPredict() {
    console.log("dimension of image: " + img1.naturalWidth, img1.naturalHeight);
    console.log("dimension of side image: " + img2.naturalWidth, img2.naturalHeight);

    // const newImage = new Image();
    // newImage.width = imgWidth;
    // newImage.height = imgHeight;
    // newImage.src = img.src;


    // container.append(newImage);


    /*
        Things to predict:
            - Chest size: 97cm
            - Waist size: 101cm
            - Inside leg: 64cm
    */

    const bodyPixProperties = {
        architecture: "MobileNetV1",
        outputStride: 16,
        multiplier: 1,
        quantBytes: 4,
    };

    const model = await bodyPix.load(bodyPixProperties);

    const frontBodySegmentation = await model.segmentPersonParts(img1, {            
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });
    const sideBodySegmentation = await model.segmentPersonParts(img2, {            
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });

    correspondingBodyPixel = Array.from(frontBodySegmentation.data);

    let line = -1;

    /* Parts related data */
    const parts = {};
    const FRONT = 0;
    const SIDE = 1;

    // Grid generation related variables
    let xMod, part;

    const generateGrid = bodySegmentation => type => parts => {
        parts[type] = {};
        const { width: w, height: h } = bodySegmentation;
        
        for(let i = -1; i <= 23; ++i) {
            parts[type][i] = {
                bounds: {
                    bottom: { x: 0, y: 0 },
                    left:   { x: w, y: 0 },
                    top:    { x: 0, y: h },
                    right:  { x: 0, y: 0 }
                },
                points: []
            }
        }

        // Generate grid for front body image
        line = -1;
        
        return bodySegmentation.data.reduce((acc, value, index) => {
            xMod = index % w;
            if(xMod === 0) {
                ++line;
                acc.push([]);
            }
            acc[line].push(value);

            let location = { x: xMod, y: line }

            part = parts[type][value]
            part.points.push(location)
            const { x, y } = location;

            const { left, right, top, bottom } = part.bounds;

            /* Re adjust the bounds */
                x < left.x    ? (left.x = x   , left.y = y)
                : x > right.x   ? (right.x = x  , right.y = y)
                : y < top.y     ? (top.x = x    , top.y = y)
                : y > bottom.y  ? (bottom.x = x , bottom.y = y)
                : null

            return acc;
        }, []);
    }
    
    const frontBodyGrid = generateGrid
        (frontBodySegmentation)
        (FRONT)
        (parts)
    
    const sideBodyGrid = generateGrid
        (sideBodySegmentation)
        (SIDE)
        (parts)

    // console.log(parts[torso_front].bounds.bottom)

    // frontBodyGrid.forEach ((row, y) => {
    //     row.forEach((value, x) => {
    //         if(y > 335 && value == torso_front)
    //             console.log(x, y);
    //     })
    // })

    /*
    allBodyPixel = [];
    leftUpperArmFront = [];

    correspondingBodyPixel.forEach((pixel, index) => {
        if (pixel !== -1) {
            allBodyPixel.push([pixel, index]);
        }

        if (pixel === 2) {
            leftUpperArmFront.push([pixel, index]);
        }
    });

    size = allBodyPixel.length;

    let tempWidth = totalHeight = totalWidth = 0;
    let leftFocal = rightFocal = temp = 0, start = 1

    for (let i = 0; i < size - 1; i++) {
        tempWidth++;

        if(start) {
            temp = allBodyPixel[i][1]
            // console.log(allBodyPixel[i][1]);
            start = 0
        }

        if (allBodyPixel[i + 1][1] - allBodyPixel[i][1] !== 1) {
            // console.log(allBodyPixel[i][1]);
            // console.log('start')
            start = 1
            totalHeight++;
            if (tempWidth > totalWidth){
                totalWidth = tempWidth;
                rightFocal = allBodyPixel[i][1]
                leftFocal = temp
            } 
            tempWidth = 0;
        }
    }

    console.log(leftFocal, rightFocal)
    console.log(
        correspondingBodyPixel[leftFocal],
        correspondingBodyPixel[rightFocal]
    );

    console.log(leftUpperArmFront);

    size = leftUpperArmFront.length;
    height = 0;
    width = 0;
    tempWidth = 0;

    for (let i = 0; i < size - 1; i++) {
        tempWidth++;
        if (leftUpperArmFront[i + 1][1] - leftUpperArmFront[i][1] !== 1) {
            height++;
            // console.log(tempWidth)
            if (tempWidth > width) width = tempWidth;
            tempWidth = 0;
        }
    }

    console.log(`height:`, height)
    */

    const frontColoredPartImage = bodyPix.toColoredPartMask(frontBodySegmentation);
    const sideColoredPartImage = bodyPix.toColoredPartMask(sideBodySegmentation);

    const opacity = 0.7;
    const flipHorizontal = false;
    const maskBlurAmount = 0;

    bodyPix.drawMask(
        canvas1, img1, frontColoredPartImage,
        opacity, maskBlurAmount, flipHorizontal);

    bodyPix.drawMask(
        canvas2, img2, sideColoredPartImage,
        opacity, maskBlurAmount, flipHorizontal);
    
    /* array generator utility */
    const range = begin => function *(end) {
        for( ; begin < end; ++begin) yield begin
    }

    const rangeInclusive = begin => end => {
        return range(begin) (end + 1);
    };

    /* Draws circle as a keypoint, on canvas */
    const drawKeypoint = ctx => location =>
        drawCircle (location) (2) (ctx)
    
    /* Draws rectangle on canvas */
    const drawRectOnCanvas = ctx => pointA => pointB => {
        return withResettingStrokeStyle
            (ctx)
            ('#33333399')
            ( () => drawRect  (pointA) (pointB) (ctx) )
            ()
    }

    const getPointsFromBounds = ({ left, right, top, bottom }) =>
    ([
        [ left.x, top.y ],
        [(right.x - left.x), (bottom.y - top.y)]
    ])

    const renderBounds = part => renderer => {
        if(part && part.points.length) {
            const { bounds } = part;
            const [ pointA, pointB ] = getPointsFromBounds(bounds)
            
            withResettingStrokeStyle
            renderer  (pointA) (pointB);
        }
    }

    const renderAllKeypoints = bodySegmentation => renderer => {
        const pose = bodySegmentation.allPoses[0].keypoints;
        for(const point of pose) {
            const { position: { x, y } } = point;
            renderer([ x, y ]);
        }
    }

    const renderAllBounds = parts => type => renderer =>
        [ ... rangeInclusive  (0) (23) ].forEach(i => {
            renderBounds (parts[type][i]) (renderer);
        })

    /* FRONT POSE INFO */

    /* Draw circles at key points of front view */
    const drawKeypointFront =
        withContext (canvas1) (drawKeypoint)
    const drawRectFront =
        withContext (canvas1) (drawRectOnCanvas)
    const renderAllBoundsFront = () =>
        renderAllBounds (parts) (FRONT) (drawRectFront)
    const renderAllKeypointsFront = () =>
        renderAllKeypoints (frontBodySegmentation) (drawKeypointFront)

    // Draw all keypoints
    renderAllKeypointsFront()
    
    // Draw rectangle bounds
    renderAllBoundsFront();

    /* SIDE POSE INFO */

    /* Draw circles at key points of side view */
    const drawKeypointSide =
        withContext (canvas2) (drawKeypoint)
    const drawRectSide =
        withContext (canvas2) (drawRectOnCanvas)
    const renderAllBoundsSide = () =>
        renderAllBounds (parts) (SIDE) (drawRectSide)
    const renderAllKeypointSide = () =>
        renderAllKeypoints (sideBodySegmentation) (drawKeypointSide)

    const sidePose = sideBodySegmentation.allPoses[0].keypoints;
    for(const prop of sidePose) {
        const { position: { x, y } } = prop;
        drawKeypointSide([x, y])
    }
    // Draw all keypoints
    renderAllKeypointSide()

    // Draw rectangle bounds
    renderAllBoundsSide()
}

loadAndPredict();
