import { resizeAspectRatio } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let colorBuffer;
let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.15, 0.25, 1.0); 
    
    return true;
}

function setupBuffers() {
    const vertices = new Float32Array([
        -0.5,  0.5,
        -0.5, -0.5,
         0.5, -0.5,
         0.5,  0.5
    ]);

    const indices = new Uint16Array([
        0, 1, 2,
        0, 2, 3
    ]);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Position Buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 2, gl.FLOAT, false, 0, 0);

    // Color Buffer (동적으로 변경하기 위해 DYNAMIC_DRAW 사용)
    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16 * 4, gl.DYNAMIC_DRAW); // 4개 정점 * 4개(RGBA) floats
    shader.setAttribPointer("a_color", 4, gl.FLOAT, false, 0, 0);

    // Element Buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.bindVertexArray(null);
}

function drawRectangle(transformMatrix, colorArray) {
    shader.setMat4("u_transform", transformMatrix);

    const colorData = new Float32Array([
        ...colorArray, ...colorArray, ...colorArray, ...colorArray
    ]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colorData);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

function render(elapsedTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    shader.use();

    let pillarModel = mat4.create();
    mat4.translate(pillarModel, pillarModel, [0.0, -0.2, 0.0]); // 화면 중앙보다 살짝 아래로
    mat4.scale(pillarModel, pillarModel, [0.1, 0.6, 1.0]);      // 기둥 모양으로 스케일
    drawRectangle(pillarModel, [0.5, 0.3, 0.1, 1.0]);           // 갈색

    // 회전 각도 계산
    const angle1 = Math.sin(elapsedTime) * Math.PI * 2.0;       
    const angle2 = Math.sin(elapsedTime) * Math.PI * -10.0;     

    // 날개들의 공통 회전 중심 (기둥의 상단)
    let baseRot = mat4.create();
    mat4.translate(baseRot, baseRot, [0.0, 0.1, 0.0]);
    mat4.rotate(baseRot, baseRot, angle1, [0, 0, 1]);

    // 2. 큰 날개 1 (오른쪽 부분)
    let lw1 = mat4.clone(baseRot);
    mat4.translate(lw1, lw1, [0.15, 0.0, 0.0]);
    mat4.scale(lw1, lw1, [0.3, 0.08, 1.0]);
    drawRectangle(lw1, [0.9, 0.9, 0.9, 1.0]);                   // 흰색

    // 3. 큰 날개 2 (왼쪽 부분)
    let lw2 = mat4.clone(baseRot);
    mat4.translate(lw2, lw2, [-0.15, 0.0, 0.0]);
    mat4.scale(lw2, lw2, [0.3, 0.08, 1.0]);
    drawRectangle(lw2, [0.9, 0.9, 0.9, 1.0]);                   // 흰색

    // 4. 작은 날개 1 (큰 날개 오른쪽 끝)
    let sw1 = mat4.clone(baseRot);
    mat4.translate(sw1, sw1, [0.3, 0.0, 0.0]);                  // 큰 날개의 끝으로 이동
    mat4.rotate(sw1, sw1, angle2, [0, 0, 1]);                   // 작은 날개 자체 회전
    mat4.scale(sw1, sw1, [0.025, 0.15, 1.0]);
    drawRectangle(sw1, [0.6, 0.6, 0.6, 1.0]);                   // 회색

    // 5. 작은 날개 2 (큰 날개 왼쪽 끝)
    let sw2 = mat4.clone(baseRot);
    mat4.translate(sw2, sw2, [-0.3, 0.0, 0.0]);                 // 큰 날개의 끝으로 이동
    mat4.rotate(sw2, sw2, angle2, [0, 0, 1]);                   // 작은 날개 자체 회전
    mat4.scale(sw2, sw2, [0.025, 0.15, 1.0]);
    drawRectangle(sw2, [0.6, 0.6, 0.6, 1.0]);                   // 회색
}

function animate(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsedTime = (currentTime - startTime) / 1000.0;     // 초 단위 변환

    render(elapsedTime);
    requestAnimationFrame(animate);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        const vertexShaderSource = await readShaderFile('shVert.glsl');
        const fragmentShaderSource = await readShaderFile('shFrag.glsl');
        shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);

        setupBuffers();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}