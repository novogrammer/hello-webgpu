import './style.css'

const appElement=document.querySelector<HTMLDivElement>('#app')!;
appElement.innerHTML = `
  <canvas id="gpuCanvas"></canvas>
`;

const shaders = `
struct VertexOut {
  @builtin(position) position : vec4f,
  @location(0) color : vec4f
}

@vertex
fn vertex_main(
  @location(0) position: vec4f,
  @location(1) color: vec4f
) -> VertexOut {
  var output : VertexOut;
  output.position = position;
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4f {
  return fragData.color;
}
`;


async function mainAsync(){


  if (!navigator.gpu) {
    throw new Error("WebGPU に対応していません。");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("WebGPU アダプターの要求に失敗しました。");
  }

  const device = await adapter.requestDevice();


  const shaderModule = device.createShaderModule({
    code: shaders,
  });


  const gpuCanvasElement = document.querySelector<HTMLCanvasElement>("#gpuCanvas")!;
  gpuCanvasElement.width=window.innerWidth;
  gpuCanvasElement.height=window.innerHeight;
  const context = gpuCanvasElement.getContext("webgpu");
  if(!context){
    throw new Error("context is null");
  }
  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });
  const vertices = new Float32Array([
    0.0, 0.6, 0, 1, // 位置
    1, 0, 0, 1, // 色
    -0.5, -0.6, 0, 1, // 位置
    0, 1, 0, 1, // 色
    0.5, -0.6, 0, 1, // 位置
    0, 0, 1, 1, // 色
  ]);
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength, // 頂点を格納するのに十分な大きさにする
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);

  const vertexBuffers:GPUVertexBufferLayout[] = [
    {
      attributes: [
        {
          shaderLocation: 0, // 位置
          offset: 0,
          format: "float32x4",
        },
        {
          shaderLocation: 1, // 色
          offset: 16,
          format: "float32x4",
        },
      ],
      arrayStride: 32,
      stepMode: "vertex",
    },
  ];

  const pipelineDescriptor:GPURenderPipelineDescriptor = {
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: vertexBuffers,
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: "auto",
  };

  const renderPipeline = device.createRenderPipeline(pipelineDescriptor);


  const commandEncoder = device.createCommandEncoder();

  const clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };

  const renderPassDescriptor:GPURenderPassDescriptor = {
    colorAttachments: [
      {
        clearValue: clearColor,
        loadOp: "clear",
        storeOp: "store",
        view: context.getCurrentTexture().createView(),
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  passEncoder.setPipeline(renderPipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
  

}

mainAsync().catch((error)=>{
  console.error(error);
  const errorElement=document.createElement("div");
  errorElement.id="error";
  errorElement.textContent=error;
  appElement.prepend(errorElement);
});
