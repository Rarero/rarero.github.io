---
layout: post
title: "LLM 기본 모델과 Azure OpenAI 실습 (1): 모델 호출부터 대화 기능까지"
date: 2026-01-12 09:00:00 +0900
tags: [Study, AI, LLM, Azure, OpenAI]
categories: AI_Study
---

이번 포스트에서는 **LLM(Large Language Model)**의 기본 개념을 알아보고, **Azure OpenAI** 서비스를 활용하여 모델 호출부터 대화 기능 구현까지 직접 실습해 보는 과정을 다룹니다.

이론보다는 **직접 코드를 실행하며 익히기**에 초점을 맞춰 진행해보겠습니다.

<br>

## 1. LLM(Large Language Model)이란?

### **기본 개념**

**LLM**은 방대한 양의 텍스트 데이터로 학습된 인공지능 언어 모델입니다. 

*   **핵심 특징**:
    *   사람처럼 자연스러운 언어를 이해하고 생성할 수 있습니다.
    *   질문에 답하고, 텍스트를 요약하고, 코드를 작성하는 등 다양한 작업을 수행합니다.
    *   "Transformer" 아키텍처를 기반으로 합니다.

*   **대표적인 LLM**:
    *   **GPT-4, GPT-3.5** (OpenAI)
    *   **Claude** (Anthropic)
    *   **Gemini** (Google)
    *   **LLaMA** (Meta)

### **왜 Azure OpenAI인가?**

Azure OpenAI 서비스는 OpenAI의 강력한 모델들(GPT-4, GPT-3.5 등)을 **Azure 클라우드 환경**에서 사용할 수 있게 해줍니다.

*   **장점**:
    *   **엔터프라이즈급 보안**: Azure의 보안 인프라 활용
    *   **한국 리전 지원**: 낮은 지연시간
    *   **통합 관리**: Azure 리소스와 통합 관리 가능
    *   **SLA 보장**: 안정적인 서비스 운영

<br>

## 2. 환경 설정

### **사전 준비사항**

1.  **Azure 구독** (무료 체험판도 가능)
2.  **Azure OpenAI 리소스 생성**
3.  **Python 3.8+** 설치
4.  **필요한 라이브러리** 설치

```bash
pip install openai python-dotenv
```

### **환경 변수 설정**

API 키와 엔드포인트를 환경 변수로 관리하는 것이 보안상 좋습니다.

`.env` 파일 생성:

```bash
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

<br>

## 3. 실습 1: Azure OpenAI 모델 기본 호출

가장 기본적인 모델 호출부터 시작해봅시다.

### **단순 텍스트 생성**

```python
import os
from openai import AzureOpenAI
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# Azure OpenAI 클라이언트 생성
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2024-02-15-preview",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

# 기본 호출
response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    messages=[
        {"role": "user", "content": "LLM이 무엇인지 한 문장으로 설명해줘"}
    ]
)

print(response.choices[0].message.content)
```

**실행 결과 예시**:
```
LLM은 방대한 텍스트 데이터로 학습하여 인간처럼 자연어를 이해하고 생성할 수 있는 대규모 언어 모델입니다.
```

<br>

## 4. 실습 2: Parameter 조절로 응답 제어하기

LLM의 동작은 다양한 **파라미터**로 세밀하게 조절할 수 있습니다.

### **주요 Parameter 설명**

| Parameter | 설명 | 범위 | 효과 |
|:---|:---|:---:|:---|
| **temperature** | 응답의 창의성/무작위성 제어 | 0.0 ~ 2.0 | 낮을수록 일관적이고 결정론적<br>높을수록 창의적이고 다양함 |
| **max_tokens** | 생성할 최대 토큰 수 | 1 ~ 모델 제한 | 응답 길이 제한 |
| **top_p** | 누적 확률 기반 샘플링 | 0.0 ~ 1.0 | 낮을수록 안정적, 높을수록 다양함 |
| **frequency_penalty** | 동일 단어 반복 억제 | -2.0 ~ 2.0 | 높을수록 반복 감소 |
| **presence_penalty** | 새로운 주제 도입 장려 | -2.0 ~ 2.0 | 높을수록 다양한 주제 |

### **Temperature 실습**

```python
def test_temperature(prompt, temp):
    """온도별 응답 차이 확인"""
    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        messages=[{"role": "user", "content": prompt}],
        temperature=temp,
        max_tokens=100
    )
    return response.choices[0].message.content

prompt = "AI의 미래에 대해 한 문장으로 예측해줘"

print("=== Temperature 0.0 (결정론적) ===")
print(test_temperature(prompt, 0.0))
print()

print("=== Temperature 1.0 (균형) ===")
print(test_temperature(prompt, 1.0))
print()

print("=== Temperature 1.8 (창의적) ===")
print(test_temperature(prompt, 1.8))
```

**실행 결과 패턴**:
*   **Temperature 0.0**: 항상 동일한 답변, 예측 가능
*   **Temperature 1.0**: 적당히 다양하면서도 합리적
*   **Temperature 1.8**: 매우 창의적이지만 때로 예측 불가

### **실용적인 Parameter 조합**

```python
# 사용 사례별 추천 설정

# 1. 정확한 정보 제공 (FAQ, 문서 요약 등)
factual_config = {
    "temperature": 0.2,
    "top_p": 0.1,
    "max_tokens": 500,
    "frequency_penalty": 0,
    "presence_penalty": 0
}

# 2. 창의적인 콘텐츠 생성 (마케팅 문구, 스토리 등)
creative_config = {
    "temperature": 1.2,
    "top_p": 0.9,
    "max_tokens": 1000,
    "frequency_penalty": 0.5,
    "presence_penalty": 0.6
}

# 3. 코드 생성 (정확성 중요)
code_config = {
    "temperature": 0.3,
    "top_p": 0.2,
    "max_tokens": 2000,
    "frequency_penalty": 0,
    "presence_penalty": 0
}
```

<br>

## 5. 실습 3: Prompt Engineering 기법

**Prompt Engineering**은 LLM에게 원하는 답변을 얻기 위해 질문(프롬프트)을 효과적으로 설계하는 기술입니다.

### **기법 1: Zero-shot vs Few-shot**

#### **Zero-shot (예제 없이)**

```python
response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    messages=[
        {"role": "user", "content": "다음 리뷰의 감정을 분석해줘: '배송도 빠르고 제품도 좋아요!'"}
    ],
    temperature=0.3
)
print(response.choices[0].message.content)
```

#### **Few-shot (예제 제공)**

```python
few_shot_prompt = """
다음은 리뷰 감정 분석 예시입니다:

리뷰: "최악이에요. 환불하고 싶어요"
감정: 부정 (신뢰도: 95%)

리뷰: "그냥 그래요. 보통입니다"
감정: 중립 (신뢰도: 80%)

리뷰: "정말 만족스럽습니다! 강력 추천해요"
감정: 긍정 (신뢰도: 98%)

이제 다음 리뷰를 분석해주세요:
리뷰: "배송도 빠르고 제품도 좋아요!"
감정:
"""

response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    messages=[{"role": "user", "content": few_shot_prompt}],
    temperature=0.3
)
print(response.choices[0].message.content)
```

### **기법 2: System Message 활용**

```python
response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    messages=[
        {
            "role": "system", 
            "content": """당신은 전문 Python 개발자입니다. 
            코드를 작성할 때는:
            1. 주석을 한글로 상세히 작성
            2. PEP 8 스타일 가이드 준수
            3. 타입 힌팅 사용
            4. 예외 처리 포함"""
        },
        {
            "role": "user", 
            "content": "파일을 읽어서 라인 수를 세는 함수를 만들어줘"
        }
    ],
    temperature=0.5
)
print(response.choices[0].message.content)
```

### **기법 3: Chain-of-Thought (사고 과정 유도)**

```python
cot_prompt = """
다음 문제를 단계별로 풀어주세요:

문제: 철수는 사과 5개를 가지고 있었습니다. 
영희에게 2개를 주고, 어머니께 3개를 더 받았습니다. 
그 후 동생과 반씩 나눠 먹었습니다. 
철수에게 남은 사과는 몇 개일까요?

단계별 풀이:
1단계)
2단계)
3단계)
최종 답:
"""

response = client.chat.completions.create(
    model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    messages=[{"role": "user", "content": cot_prompt}],
    temperature=0.3
)
print(response.choices[0].message.content)
```

<br>

## 6. 실습 4: 멀티모달 - 이미지와 텍스트 함께 사용

GPT-4 Vision 모델을 사용하면 **이미지를 이해**하고 분석할 수 있습니다.

### **이미지 URL 기반 분석**

```python
response = client.chat.completions.create(
    model="gpt-4-vision",  # Vision 모델 사용
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "이 이미지에 무엇이 보이나요? 자세히 설명해주세요."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg"
                    }
                }
            ]
        }
    ],
    max_tokens=500
)
print(response.choices[0].message.content)
```

### **로컬 이미지 분석**

```python
import base64

def encode_image(image_path):
    """로컬 이미지를 base64로 인코딩"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# 이미지 인코딩
base64_image = encode_image("./my_image.jpg")

response = client.chat.completions.create(
    model="gpt-4-vision",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "이 이미지의 주요 객체들을 식별하고 각각의 위치를 설명해주세요."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}"
                    }
                }
            ]
        }
    ],
    max_tokens=1000
)
print(response.choices[0].message.content)
```

### **실용 예제: 문서 OCR + 분석**

```python
def analyze_receipt(image_path):
    """영수증 이미지를 분석하여 정보 추출"""
    base64_image = encode_image(image_path)
    
    response = client.chat.completions.create(
        model="gpt-4-vision",
        messages=[
            {
                "role": "system",
                "content": "당신은 영수증 분석 전문가입니다. JSON 형식으로 정보를 추출하세요."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": """이 영수증에서 다음 정보를 추출해주세요:
                        - 상점명
                        - 날짜
                        - 총 금액
                        - 주요 품목 리스트
                        
                        JSON 형식으로 응답해주세요."""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        temperature=0.2,
        max_tokens=1000
    )
    return response.choices[0].message.content

# 사용 예시
# result = analyze_receipt("receipt.jpg")
# print(result)
```

<br>

## 7. 실습 5: 대화 History 기능 구현

실제 챗봇처럼 **대화 맥락을 유지**하는 기능을 구현해봅시다.

### **기본 대화 History**

```python
class ChatBot:
    """대화 히스토리를 관리하는 챗봇 클래스"""
    
    def __init__(self, system_message="당신은 친절한 AI 어시스턴트입니다."):
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-15-preview",
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        self.messages = [
            {"role": "system", "content": system_message}
        ]
    
    def chat(self, user_message):
        """사용자 메시지를 받아 응답 생성"""
        # 사용자 메시지 추가
        self.messages.append({"role": "user", "content": user_message})
        
        # 응답 생성
        response = self.client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=self.messages,
            temperature=0.7,
            max_tokens=500
        )
        
        # 어시스턴트 응답 추가
        assistant_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": assistant_message})
        
        return assistant_message
    
    def get_history(self):
        """대화 히스토리 반환"""
        return self.messages
    
    def clear_history(self):
        """히스토리 초기화 (시스템 메시지는 유지)"""
        self.messages = [self.messages[0]]

# 사용 예시
bot = ChatBot(system_message="당신은 Python 프로그래밍 전문가입니다.")

print("Bot:", bot.chat("안녕하세요! Python을 배우고 싶어요"))
print("\nBot:", bot.chat("리스트와 튜플의 차이가 뭔가요?"))
print("\nBot:", bot.chat("그럼 언제 튜플을 사용하는 게 좋나요?"))

# 대화 히스토리 확인
print("\n=== 전체 대화 히스토리 ===")
for msg in bot.get_history():
    print(f"{msg['role']}: {msg['content'][:50]}...")
```

### **토큰 제한 관리**

대화가 길어지면 토큰 제한에 걸릴 수 있습니다. 이를 관리하는 방법:

```python
import tiktoken

class SmartChatBot(ChatBot):
    """토큰 관리 기능이 있는 스마트 챗봇"""
    
    def __init__(self, system_message="당신은 친절한 AI 어시스턴트입니다.", max_tokens=4000):
        super().__init__(system_message)
        self.max_tokens = max_tokens
        self.encoding = tiktoken.encoding_for_model("gpt-4")
    
    def count_tokens(self, messages):
        """메시지 리스트의 총 토큰 수 계산"""
        num_tokens = 0
        for message in messages:
            num_tokens += 4  # 메시지 포맷팅 오버헤드
            for key, value in message.items():
                num_tokens += len(self.encoding.encode(value))
        return num_tokens
    
    def trim_history(self):
        """오래된 대화를 제거하여 토큰 수 관리"""
        while len(self.messages) > 2:  # 시스템 메시지는 항상 유지
            if self.count_tokens(self.messages) <= self.max_tokens:
                break
            # 가장 오래된 사용자-어시스턴트 메시지 쌍 제거
            self.messages.pop(1)  # 시스템 메시지 다음 것 제거
            if len(self.messages) > 1:
                self.messages.pop(1)
    
    def chat(self, user_message):
        """토큰 관리를 포함한 채팅"""
        self.messages.append({"role": "user", "content": user_message})
        self.trim_history()  # 토큰 제한 체크
        
        response = self.client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=self.messages,
            temperature=0.7,
            max_tokens=500
        )
        
        assistant_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": assistant_message})
        
        return assistant_message

# 사용 예시
smart_bot = SmartChatBot(max_tokens=2000)
```

### **실전 챗봇 애플리케이션**

```python
def run_chatbot():
    """터미널 기반 대화형 챗봇"""
    print("=== Azure OpenAI 챗봇 ===")
    print("종료하려면 'quit', 'exit', 또는 'q'를 입력하세요")
    print("히스토리를 지우려면 'clear'를 입력하세요\n")
    
    bot = SmartChatBot(
        system_message="""당신은 친절하고 유용한 AI 어시스턴트입니다.
        사용자의 질문에 정확하고 이해하기 쉽게 답변해주세요.
        필요하다면 코드 예시도 제공하세요.""",
        max_tokens=3000
    )
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                print("챗봇을 종료합니다. 안녕히 가세요!")
                break
            
            if user_input.lower() == 'clear':
                bot.clear_history()
                print("대화 히스토리가 초기화되었습니다.\n")
                continue
            
            if not user_input:
                continue
            
            response = bot.chat(user_input)
            print(f"\nBot: {response}\n")
            
        except KeyboardInterrupt:
            print("\n\n챗봇을 종료합니다.")
            break
        except Exception as e:
            print(f"\n오류 발생: {e}\n")

# 실행
# run_chatbot()
```

<br>

## 8. 종합 실습: 실용적인 AI 어시스턴트 만들기

지금까지 배운 내용을 모두 활용한 종합 예제입니다.

```python
class AdvancedAssistant:
    """모든 기능을 통합한 고급 AI 어시스턴트"""
    
    def __init__(self):
        self.client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version="2024-02-15-preview",
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        self.conversation_history = []
        self.max_history_length = 10
    
    def text_chat(self, message, temperature=0.7, mode="balanced"):
        """텍스트 기반 채팅 (모드별 파라미터 자동 설정)"""
        configs = {
            "factual": {"temperature": 0.2, "top_p": 0.1},
            "balanced": {"temperature": 0.7, "top_p": 0.9},
            "creative": {"temperature": 1.2, "top_p": 0.95}
        }
        
        config = configs.get(mode, configs["balanced"])
        
        self.conversation_history.append({"role": "user", "content": message})
        
        response = self.client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=self.conversation_history[-self.max_history_length:],
            **config,
            max_tokens=1000
        )
        
        assistant_msg = response.choices[0].message.content
        self.conversation_history.append({"role": "assistant", "content": assistant_msg})
        
        return assistant_msg
    
    def analyze_image(self, image_path, question="이 이미지를 설명해주세요"):
        """이미지 분석 (멀티모달)"""
        base64_image = encode_image(image_path)
        
        response = self.client.chat.completions.create(
            model="gpt-4-vision",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": question},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        
        return response.choices[0].message.content
    
    def get_summary(self):
        """대화 요약 생성"""
        if len(self.conversation_history) < 2:
            return "대화 내용이 부족하여 요약할 수 없습니다."
        
        summary_prompt = f"""다음 대화 내용을 3-5문장으로 요약해주세요:

{self.conversation_history}

요약:"""
        
        response = self.client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.3,
            max_tokens=300
        )
        
        return response.choices[0].message.content

# 사용 예시
# assistant = AdvancedAssistant()
# 
# # 일반 대화
# print(assistant.text_chat("파이썬의 장점을 알려줘", mode="factual"))
# 
# # 이미지 분석
# print(assistant.analyze_image("document.jpg", "이 문서의 핵심 내용을 요약해줘"))
# 
# # 대화 요약
# print(assistant.get_summary())
```

<br>

## 9. 다음 포스트 예고

이번 포스트에서는 **LLM 기본 개념**과 **Azure OpenAI 실습**의 기초를 다뤘습니다.

다음 포스트에서는 더욱 고급 기능들을 다룰 예정입니다:

*   **Function Calling**: LLM이 외부 함수/API를 호출하게 만들기
*   **RAG (Retrieval-Augmented Generation)**: 문서 기반 질의응답 시스템
*   **Embedding & Vector DB**: 의미 기반 검색 구현
*   **Fine-tuning**: 커스텀 모델 학습
*   **실전 프로젝트**: 기업용 문서 챗봇 만들기

<br>

---

**참고 자료**:
*   [Azure OpenAI 공식 문서](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
*   [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
*   [Prompt Engineering Guide](https://www.promptingguide.ai/)