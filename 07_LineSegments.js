import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let isInitialized = false;
let shader;
let vao;
let positionBuffer;

// 상태 관리 변수 (0: 초기, 1: 원 그리는 중, 2: 원 완성됨, 3: 선분 그리는 중, 4: 선분 완성됨)
let step = 0; 
let circleCenter = null;
let circleRadius = 0;
let lineStart = null;
let lineEnd = null;
let intersections = []; // 교차점 좌표 배열

let textOverlay;  // 1st line (원 정보)
let textOverlay2; // 2nd line (선분 정보)
let textOverlay3; // 3rd line (교차점 정보)
let axes = new Axes(gl, 0.85);

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    main().then(success => {
        if (!success) return;
        isInitialized = true;
    }).catch(error => console.error('Error:', error));
});

function initWebGL() {
    if (!gl) return false;
    canvas.width = 700; // 초기 canvas 크기 조건
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
    return true;
}

function setupBuffers() {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
}

function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

// 원을 그리기 위한 정점(Vertex) 데이터 생성 함수
function generateCircleVertices(cx, cy, r, segments = 100) {
    let vertices = [];
    for (let i = 0; i <= segments; i++) {
        let theta = (i / segments) * 2.0 * Math.PI;
        vertices.push(cx + r * Math.cos(theta), cy + r * Math.sin(theta));
    }
    return vertices;
}

// 교차점 계산 (2차 방정식 근의 공식 활용)
function calculateIntersections() {
    intersections = [];
    let [x0, y0] = lineStart;
    let [x1, y1] = lineEnd;
    let [cx, cy] = circleCenter;
    let r = circleRadius;

    let dx = x1 - x0;
    let dy = y1 - y0;
    let fx = x0 - cx;
    let fy = y0 - cy;

    let a = dx * dx + dy * dy;
    let b = 2 * (fx * dx + fy * dy);
    let c = (fx * fx + fy * fy) - r * r;

    let discriminant = b * b - 4 * a * c;

    if (discriminant >= 0) {
        discriminant = Math.sqrt(discriminant);
        let t1 = (-b - discriminant) / (2 * a);
        let t2 = (-b + discriminant) / (2 * a);

        // 선분 안에 있는 점(0 <= t <= 1)인지 확인
        if (t1 >= 0 && t1 <= 1) {
            intersections.push([x0 + t1 * dx, y0 + t1 * dy]);
        }
        if (t2 >= 0 && t2 <= 1 && discriminant !== 0) {
            intersections.push([x0 + t2 * dx, y0 + t2 * dy]);
        }
    }

    // 결과 텍스트 업데이트
    if (intersections.length === 0) {
        updateText(textOverlay3, "No intersection");
    } else if (intersections.length === 1) {
        updateText(textOverlay3, `Intersection Points: 1 Point 1: (${intersections[0][0].toFixed(2)}, ${intersections[0][1].toFixed(2)})`);
    } else {
        updateText(textOverlay3, `Intersection Points: 2 Point 1: (${intersections[0][0].toFixed(2)}, ${intersections[0][1].toFixed(2)}) Point 2: (${intersections[1][0].toFixed(2)}, ${intersections[1][1].toFixed(2)})`);
    }
}

function setupMouseEvents() {
    canvas.addEventListener("mousedown", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let [glX, glY] = convertToWebGLCoordinates(x, y);

        if (step === 0) { // 원의 중심점 입력
            circleCenter = [glX, glY];
            step = 1;
        } else if (step === 2) { // 선분의 시작점 입력
            lineStart = [glX, glY];
            step = 3;
        }
    });

    canvas.addEventListener("mousemove", (event) => {
        if (step === 1 || step === 3) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            let [glX, glY] = convertToWebGLCoordinates(x, y);

            if (step === 1) { // 드래그하여 반지름 계산
                circleRadius = Math.sqrt(Math.pow(glX - circleCenter[0], 2) + Math.pow(glY - circleCenter[1], 2));
            } else if (step === 3) { // 임시 선분 끝점
                lineEnd = [glX, glY];
            }
            render();
        }
    });

    canvas.addEventListener("mouseup", () => {
        if (step === 1) { // 원 입력 완료
            step = 2;
            updateText(textOverlay, `Circle: center (${circleCenter[0].toFixed(2)}, ${circleCenter[1].toFixed(2)}) radius = ${circleRadius.toFixed(2)}`);
            updateText(textOverlay2, "");
            render();
        } else if (step === 3 && lineEnd) { // 선분 입력 완료
            step = 4;
            updateText(textOverlay2, `Line segment: (${lineStart[0].toFixed(2)}, ${lineStart[1].toFixed(2)}) ~ (${lineEnd[0].toFixed(2)}, ${lineEnd[1].toFixed(2)})`);
            calculateIntersections();
            render();
        }
    });
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();
    
    // 1. 원 그리기 (보라색)
    if (circleCenter && circleRadius > 0) {
        let circleVertices = generateCircleVertices(circleCenter[0], circleCenter[1], circleRadius);
        shader.setVec4("u_color", [0.6, 0.2, 0.8, 1.0]); 
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINE_LOOP, 0, circleVertices.length / 2);
    }

    // 2. 선분 그리기 (파란색/회색)
    if (step >= 3 && lineStart && lineEnd) {
        if (step === 3) { // 드래그 중인 임시 선분 (회색)
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        } else { // 완료된 선분 (파란빛 섞인 흰색)
            shader.setVec4("u_color", [0.6, 0.7, 0.9, 1.0]); 
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lineStart, ...lineEnd]), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.LINES, 0, 2);
    }

    // 3. 교차점 그리기 (노란색 Points)
    if (step === 4 && intersections.length > 0) {
        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]); // Yellow
        let pointData = [];
        for (let pt of intersections) {
            pointData.push(pt[0], pt[1]);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointData), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, intersections.length);
    }

    // Axes 그리기
    axes.draw(mat4.create(), mat4.create());
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
            return false;
        }

        await initShader();
        setupBuffers();
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "Click and drag to draw a circle", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3);
        
        setupMouseEvents();
        render();

        return true;
        
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
