```mermaid
flowchart LR
    %% 样式定义
    classDef core fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef process fill:#cce5ff,stroke:#0066cc
    classDef standard fill:#fff0e6,stroke:#ff9900
    classDef outcome fill:#e6ffe6,stroke:#009900

    %% 核心目标
    subgraph CoreGoal[核心目标: 标准化前后端协作流程]
        direction TB
        G1[提升联调效率]:::core
        G2[解决接口定义/Mock/错误处理混乱问题]:::core
    end
    style CoreGoal fill:#f0f8ff,stroke:#0066cc,stroke-width:1px
    
    %% 流程阶段
    subgraph ProcessFlow[协作流程阶段]
        direction TB
        P1[1. 接口设计阶段]:::process
        P2[2. 并行开发阶段]:::process
        P3[3. 联调测试阶段]:::process
        P4[4. 变更管理阶段]:::process
    end
    style ProcessFlow fill:#f8f9fa,stroke:#495057,stroke-width:1px
    
    %% 规范体系
    subgraph Standards[标准化规范体系]
        S1[API 管理平台规范]:::standard
        S2[接口设计规范]:::standard
        S3[数据结构规范]:::standard
        S4[类型安全规范]:::standard
        S5[变更管理规范]:::standard
    end
    style Standards fill:#fff9e6,stroke:#ff9900,stroke-width:1px
    
    %% 关键成果
    subgraph Outcomes[关键验收成果]
        O1[✅ ApiFox 为唯一接口文档来源<br/>后端开发前完成接口定义与 Mock]:::outcome
        O2[✅ URL 命名/HTTP Method/版本控制<br>(v1/v2) 规范]:::outcome
        O3[✅ 统一响应结构 {code, data, message}<br>通用错误码定义]:::outcome
        O4[✅ 前端基于 OpenAPI 自动生成 TS 类型<br>确保类型一致性]:::outcome
        O5[✅ 接口变更通知机制<br>Breaking Change 需提前同步]:::outcome
    end
    style Outcomes fill:#f0fff4,stroke:#009900,stroke-width:1px
    
    %% 关联关系
    CoreGoal --> ProcessFlow
    ProcessFlow --> Standards
    Standards --> Outcomes
    
    %% 具体映射
    P1 --> S1
    P1 --> S2
    P1 --> S3
    P2 --> S4
    P4 --> S5
    
    S1 --> O1
    S2 --> O2
    S3 --> O3
    S4 --> O4
    S5 --> O5
```
