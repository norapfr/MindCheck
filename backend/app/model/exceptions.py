class TextTooShortError(Exception):
    """Se lanza cuando el texto, DESPUÉS de clean_text, tiene menos
    palabras que MIN_WORDS_AFTER_CLEANING. La ruta la traduce a un 422."""

    def __init__(self, word_count: int, min_words: int):
        self.word_count = word_count
        self.min_words = min_words
        super().__init__(
            f"Texto de {word_count} palabras tras preprocesar, mínimo {min_words}"
        )