"""
NLI stance detection using HuggingFace transformers.
Default: roberta-large-mnli (or lighter alternative for CPU).
"""
import os
import re
from typing import Literal, Optional, Tuple
from transformers import pipeline


_nli_pipeline = None


def get_nli_pipeline():
    """Lazy-load NLI pipeline with safe fallback when HF/torch is missing."""
    global _nli_pipeline
    if _nli_pipeline is None:
        model_name = os.getenv("NLI_MODEL", "facebook/bart-large-mnli")
        use_hf_endpoint = os.getenv("USE_HF_ENDPOINT", "false").lower() == "true"

        if use_hf_endpoint:
            # TODO: Implement HF Inference API endpoint call
            raise NotImplementedError("HF endpoint not yet implemented")

        try:
            _nli_pipeline = pipeline("zero-shot-classification", model=model_name, device=-1)
        except Exception as e:
            print(f"NLI pipeline load failed, using heuristic fallback: {e}")
            _nli_pipeline = None

    return _nli_pipeline


def check_relevance(premise: str, hypothesis: str) -> Tuple[bool, float]:
    """
    Check if the premise (article) is actually relevant to the hypothesis (claim).
    Returns (is_relevant, confidence_score).
    """
    if not premise or not hypothesis:
        return False, 0.0

    # Extract key entities from hypothesis (claim)
    key_words = extract_key_words(hypothesis)

    # Check if key entities appear in premise
    premise_lower = premise.lower()
    found_entities = []

    for word in key_words:
        # Use word boundaries to avoid partial matches
        if re.search(r'\b' + re.escape(word.lower()) + r'\b', premise_lower):
            found_entities.append(word)

    relevance_score = len(found_entities) / len(key_words) if key_words else 0.0

    # VERY lenient: if we have NO key words extracted, assume relevant with low score
    # Otherwise, consider relevant if > 15% of key words found
    if len(key_words) == 0:
        return True, 0.3  # Assume relevant with modest score
    
    is_relevant = relevance_score > 0.15

    return is_relevant, relevance_score


def extract_key_words(text: str) -> list[str]:
    """
    Extract key nouns and proper nouns from text.
    Focus on entities that would be mentioned in relevant articles.
    """
    # Extract both capitalized words AND important lowercase keywords
    capitalized = re.findall(r'\b[A-Z][a-z]+\b|\b[A-Z]+(?:\s+[A-Z]+)*\b', text)
    
    # Also extract important lowercase words (nouns, verbs)
    all_words = re.findall(r'\b\w{4,}\b', text.lower())  # Words with 4+ chars
    
    # Filter out common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'from', 'into', 'about', 'after', 'before', 'during', 'while'}
    
    # Combine capitalized words and filtered lowercase words
    key_words = [word for word in capitalized if len(word) > 2 and word.lower() not in stop_words]
    key_words.extend([word for word in all_words if word not in stop_words and word not in [k.lower() for k in key_words]])
    
    return key_words[:15]  # Limit to top 15 words


def classify_stance(premise: str, hypothesis: str) -> tuple[Literal["supports", "refutes", "neutral"], float]:
    """
    Classify stance between premise (article text) and hypothesis (claim).
    Pipeline path: uses HF transformers if available, otherwise falls back to a
    heuristic based on relevance and cue words. Always returns a usable score.
    """
    if not premise or not hypothesis:
        return "neutral", 0.0

    try:
        # Step 1: Relevance gate
        is_relevant, relevance_score = check_relevance(premise, hypothesis)
        
        print(f"[classify_stance] Relevance check: is_relevant={is_relevant}, score={relevance_score:.3f}")
        
        if not is_relevant:
            return "neutral", 0.0

        # Step 2: Try transformers pipeline
        pipe = get_nli_pipeline()
        if pipe is not None:
            result = pipe(
                premise,
                candidate_labels=[
                    "supports the claim",
                    "refutes the claim",
                    "neutral to the claim",
                ],
                hypothesis_template="{}",
            )

            label = result["labels"][0]
            score = result["scores"][0]

            if "refutes" in label.lower():
                stance = "refutes"
            elif "supports" in label.lower():
                stance = "supports"
            else:
                stance = "neutral"

            final_score = score * relevance_score
            print(f"[classify_stance] Transformers result: stance={stance}, score={final_score:.3f}")
            return stance, final_score

        # Step 3: Heuristic fallback (no transformers/torch)
        print(f"[classify_stance] Using heuristic fallback (no transformers)")
        text = premise.lower()
        hypothesis_lower = hypothesis.lower()
        
        # Suspicious/fake news indicators
        neg_cues = [
            "false", "fake", "hoax", "rumor", "not true", "no plans",
            "denied", "debunked", "misleading", "refuted", "fact-check: false",
            "no evidence", "unverified", "fabricated", "misinformation"
        ]
        
        # Suspicious claims patterns (unusual/extraordinary claims)
        suspicious_patterns = [
            "painted gold", "paint gold", "to be painted", "will be painted",
            "second sun", "two suns", "aliens", "ufo landing", "miracle cure",
            "secret government", "conspiracy", "shocking discovery"
        ]
        
        # Real news indicators
        pos_cues = [
            "announced", "confirmed", "will require", "mandatory", "official",
            "govt", "ministry", "press release", "notification", "railways", "irctc",
            "according to", "statement", "spokesperson", "minister said"
        ]

        # Check if the claim itself contains suspicious patterns
        if any(pattern in hypothesis_lower for pattern in suspicious_patterns):
            # Suspicious claim - unless premise strongly supports it, mark as refutes
            if not any(cue in text for cue in pos_cues):
                final_score = 0.6 * relevance_score
                print(f"[classify_stance] Heuristic: suspicious claim detected, refutes, score={final_score:.3f}")
                return "refutes", final_score

        if any(cue in text for cue in neg_cues):
            final_score = 0.7 * relevance_score
            print(f"[classify_stance] Heuristic: refutes, score={final_score:.3f}")
            return "refutes", final_score
        if any(cue in text for cue in pos_cues):
            final_score = 0.6 * relevance_score
            print(f"[classify_stance] Heuristic: supports, score={final_score:.3f}")
            return "supports", final_score

        # If relevant but no cues, treat as neutral with moderate confidence
        final_score = 0.5 * relevance_score
        print(f"[classify_stance] Heuristic: neutral (no cues), score={final_score:.3f}")
        return "neutral", final_score

    except Exception as e:
        print(f"NLI classification error: {e}")
        return "neutral", 0.0
