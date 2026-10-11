// ═══════════════════════════════════════════════════════════════
// MindShift 3D — BarChart
// Procedural bar chart for comparing cognitive category scores
// against standard baseline benchmarks.
// ═══════════════════════════════════════════════════════════════
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace MindShift.UI
{
    [RequireComponent(typeof(CanvasRenderer))]
    public class BarChart : MaskableGraphic
    {
        [Header("Dimensions")]
        public float chartWidth  = 340f;
        public float chartHeight = 180f;
        public float barSpacing  = 16f;

        [Header("Colors")]
        public Color barColor          = new Color(0f, 0.75f, 1f, 0.85f);
        public Color benchmarkLineColor= new Color(1f, 0.4f, 0.2f, 0.75f);
        public Color axisColor         = new Color(1f, 1f, 1f, 0.2f);
        public float benchmarkValue    = 0.70f; // 70% threshold

        private float[] _values = new float[] { 0.82f, 0.65f, 0.90f, 0.74f, 0.88f, 0.60f };

        public void SetValues(float[] values)
        {
            if (values == null || values.Length == 0) return;
            _values = new float[values.Length];
            for (int i = 0; i < values.Length; i++)
            {
                _values[i] = Mathf.Clamp01(values[i]);
            }
            SetVerticesDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();

            int count = _values != null ? _values.Length : 0;
            if (count == 0) return;

            Vector2 origin = new Vector2(-chartWidth * 0.5f, -chartHeight * 0.5f);

            // Draw baseline / bottom axis
            DrawQuad(vh,
                origin,
                origin + new Vector2(chartWidth, 0),
                origin + new Vector2(chartWidth, 2f),
                origin + new Vector2(0, 2f),
                axisColor);

            // Draw Benchmark target line
            float benchmarkY = origin.y + (chartHeight * benchmarkValue);
            DrawQuad(vh,
                new Vector2(origin.x, benchmarkY - 1f),
                new Vector2(origin.x + chartWidth, benchmarkY - 1f),
                new Vector2(origin.x + chartWidth, benchmarkY + 1f),
                new Vector2(origin.x, benchmarkY + 1f),
                benchmarkLineColor);

            // Draw individual bars
            float totalSpacing = barSpacing * (count + 1);
            float barWidth = Mathf.Max(8f, (chartWidth - totalSpacing) / count);

            for (int i = 0; i < count; i++)
            {
                float x = origin.x + barSpacing + i * (barWidth + barSpacing);
                float h = chartHeight * _values[i];

                Vector2 bl = new Vector2(x, origin.y);
                Vector2 br = new Vector2(x + barWidth, origin.y);
                Vector2 tr = new Vector2(x + barWidth, origin.y + h);
                Vector2 tl = new Vector2(x, origin.y + h);

                DrawQuad(vh, bl, br, tr, tl, barColor);
            }
        }

        private void DrawQuad(VertexHelper vh, Vector2 bl, Vector2 br, Vector2 tr, Vector2 tl, Color c)
        {
            int startIdx = vh.currentVertCount;

            UIVertex v1 = UIVertex.simpleVert; v1.position = bl; v1.color = c;
            UIVertex v2 = UIVertex.simpleVert; v2.position = br; v2.color = c;
            UIVertex v3 = UIVertex.simpleVert; v3.position = tr; v3.color = c;
            UIVertex v4 = UIVertex.simpleVert; v4.position = tl; v4.color = c;

            vh.AddVert(v1);
            vh.AddVert(v2);
            vh.AddVert(v3);
            vh.AddVert(v4);

            vh.AddTriangle(startIdx, startIdx + 1, startIdx + 2);
            vh.AddTriangle(startIdx + 2, startIdx + 3, startIdx);
        }
    }
}
