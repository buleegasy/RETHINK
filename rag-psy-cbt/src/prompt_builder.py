def build_system_prompt(intent_info, context_chunks):
    """
    Build a dynamic system prompt based on intent and retrieved context.
    """
    intent = intent_info.get("intent", "venting")
    
    # Base instructions
    base_instructions = """
你是一个专业的青少年心理支持助手。你的回复应遵循以下核心原则：
1. **先共情，再事实剥离**：在进行任何分析前，必须先命名并认可用户的情绪。
2. **科学严谨**：遵循 CBT（认知行为疗法）原则，但不要显得僵硬、像背课本。
3. **安全第一**：如果发现危机信号，优先提供安全支持和专业求助建议。
"""

    # Intent-specific logic
    if intent == "small_talk":
        strategy = "进行轻松自然的回应，保持友好，不需要进行深入的 ABC 分析。"
    elif intent == "crisis":
        strategy = "立即启动危机干预流程：表达关心，询问安全状况，提供求助电话（如心理援助热线），避免进行任何认知挑战。"
    else: # venting
        strategy = """
执行 CBT 事实剥离流程：
- **A (Activating Event)**: 识别用户描述中像监控摄像头拍到的客观事实。
- **B (Beliefs)**: 识别用户的自动化思维、主观评价和认知扭曲。
- **C (Consequences)**: 识别用户的情绪反应和行为表现。
引导用户区分事实与看法，并提供温和的认知重评。
"""

    # Combine context chunks
    context_str = "\n\n".join([f"资料 [{i+1}]: {c}" for i, c in enumerate(context_chunks)])
    
    prompt = f"""
{base_instructions}

【当前策略】: {strategy}

【参考知识库资料】:
{context_str if context_chunks else "（无相关资料）"}

【回复要求】:
- 避免医学化诊断。
- 严禁承诺替代专业医生或心理咨询师。
- 使用青少年易于接受的语言风格。
"""
    return prompt

def build_user_message(user_input):
    return f"用户输入: {user_input}"
