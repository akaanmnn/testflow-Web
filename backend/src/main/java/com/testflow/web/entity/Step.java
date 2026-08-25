package com.testflow.web.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "steps")
@Getter @Setter @NoArgsConstructor
public class Step {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scenario_id", nullable = false)
    private Scenario scenario;

    @Column(nullable = false)
    private int orderIndex;

    @Column(nullable = false)
    private String action;

    /** Locator adayları — JSON string. */
    @Column(columnDefinition = "TEXT")
    private String candidates;

    /** Sabit değer (dataBinding yoksa kullanılır). value SQL'de rezerve olabildiği için kolon adı step_value. */
    @Column(name = "step_value", columnDefinition = "TEXT")
    private String value;

    /**
     * Test verisi bağlama — JSON string, örn: {"dataSetKey":"kullanici_email"}.
     * Doluysa koşum sırasında value yerine test data setindeki karşılık kullanılır.
     */
    @Column(columnDefinition = "TEXT")
    private String dataBinding;

    @Column(nullable = false)
    private boolean sensitive = false;

    /** Ek meta — JSON string. */
    @Column(columnDefinition = "TEXT")
    private String meta;
}
